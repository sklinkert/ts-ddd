import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { newUuid } from '../../domain/branded-id';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns (or propagates) an X-Request-Id and logs one line per request
 * on finish with method, path, status, and latency.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('http');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.header(REQUEST_ID_HEADER) ?? newUuid();
    res.setHeader(REQUEST_ID_HEADER, requestId);

    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      this.logger.log({
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        duration_ms: Math.round(durationMs * 10) / 10,
        request_id: requestId,
      });
    });

    next();
  }
}
