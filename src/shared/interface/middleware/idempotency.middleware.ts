import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';

const HEADER = 'idempotency-key';

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

    const result = await this.idempotency.lookup(key, method, path, requestHash);

    if (result.kind === 'hit') {
      res.status(result.response.status).json(result.response.body);
      return;
    }

    if (result.kind === 'conflict') {
      res
        .status(HttpStatus.CONFLICT)
        .json({ code: 'idempotency_conflict', message: 'Idempotency-Key reused with different request body' });
      return;
    }

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
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const buffer = Buffer.concat(chunks);
      let body: unknown = null;
      if (buffer.length > 0) {
        try {
          body = JSON.parse(buffer.toString('utf8'));
        } catch {
          body = buffer.toString('utf8');
        }
      }
      void this.idempotency.record(key, method, path, requestHash, res.statusCode, body);
    });

    next();
  }
}
