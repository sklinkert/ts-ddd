import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';

const HEADER = 'idempotency-key';
const RETRY_AFTER_SECONDS = 1;

/**
 * NOTE: This middleware buffers the JSON response body in memory so it can
 * be stored for replay. It is intentionally scoped to JSON-emitting
 * routes (POST/PUT/PATCH on /api/v1/*) and is not safe for streaming or
 * binary responses. Do not apply it to file uploads or SSE endpoints.
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly idempotency: IdempotencyService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const key = req.header(HEADER);
    if (!key) {
      next();
      return;
    }

    const method = req.method;
    const path = req.originalUrl.split('?')[0];
    const requestHash = this.idempotency.hashRequest(req.body);

    const result = await this.idempotency.claim(key, method, path, requestHash);

    if (result.kind === 'replay') {
      res.status(result.response.status).json(result.response.body);
      return;
    }

    if (result.kind === 'in_flight') {
      res.status(HttpStatus.CONFLICT).set('Retry-After', String(RETRY_AFTER_SECONDS)).json({
        code: 'idempotency_in_flight',
        message: 'A request with this Idempotency-Key is still being processed',
      });
      return;
    }

    if (result.kind === 'conflict') {
      res.status(HttpStatus.CONFLICT).json({
        code: 'idempotency_conflict',
        message: 'Idempotency-Key reused with different request body',
      });
      return;
    }

    // We claimed the row — buffer the response so we can record it.
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, ...rest: unknown[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return (originalWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
    }) as Response['write'];

    res.end = ((chunk?: unknown, ...rest: unknown[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return (originalEnd as (...args: unknown[]) => Response)(chunk, ...rest);
    }) as Response['end'];

    res.on('finish', () => {
      void this.persistResult(key, method, path, res.statusCode, chunks);
    });

    next();
  }

  private async persistResult(
    key: string,
    method: string,
    path: string,
    status: number,
    chunks: Buffer[],
  ): Promise<void> {
    // Only cache successful responses; release the claim on failure so the
    // client can retry the operation cleanly.
    if (status < 200 || status >= 300) {
      await this.idempotency.releaseClaim(key, method, path);
      return;
    }

    const buffer = Buffer.concat(chunks);
    let body: unknown = null;
    if (buffer.length > 0) {
      try {
        body = JSON.parse(buffer.toString('utf8'));
      } catch {
        body = buffer.toString('utf8');
      }
    }
    await this.idempotency.completeClaim(key, method, path, status, body);
  }
}
