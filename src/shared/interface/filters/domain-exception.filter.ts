import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConflictError, DomainError, InvariantViolation, NotFoundError } from '../../domain/errors';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    if (exception instanceof DomainError) {
      res.status(mapDomainErrorStatus(exception)).json({
        code: exception.code,
        message: exception.message,
      } satisfies ErrorBody);
      return;
    }

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(normalizeHttpException(exception));
      return;
    }

    this.logger.error(
      `Unhandled exception on ${req.method} ${req.originalUrl}: ${
        exception instanceof Error ? exception.message : String(exception)
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'internal_error',
      message: 'Internal server error',
    } satisfies ErrorBody);
  }
}

function mapDomainErrorStatus(err: DomainError): number {
  if (err instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (err instanceof ConflictError) return HttpStatus.CONFLICT;
  if (err instanceof InvariantViolation) return HttpStatus.BAD_REQUEST;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

function normalizeHttpException(exception: HttpException): ErrorBody {
  const status = exception.getStatus();
  const raw = exception.getResponse();

  const code = httpStatusToCode(status);

  if (typeof raw === 'string') {
    return { code, message: raw };
  }

  const obj = raw as Record<string, unknown>;
  const rawMessage = obj.message ?? obj.error ?? exception.message;
  if (Array.isArray(rawMessage)) {
    return {
      code,
      message: 'Request validation failed',
      details: rawMessage,
    };
  }
  return {
    code,
    message: typeof rawMessage === 'string' ? rawMessage : exception.message,
  };
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'bad_request';
    case HttpStatus.UNAUTHORIZED:
      return 'unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'forbidden';
    case HttpStatus.NOT_FOUND:
      return 'not_found';
    case HttpStatus.CONFLICT:
      return 'conflict';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'unprocessable_entity';
    default:
      return status >= 500 ? 'internal_error' : 'http_error';
  }
}
