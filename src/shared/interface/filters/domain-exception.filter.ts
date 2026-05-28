import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ConflictError, DomainError, InvariantViolation, NotFoundError } from '../../domain/errors';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { message: body } : body);
      return;
    }

    if (exception instanceof DomainError) {
      const status = mapDomainErrorStatus(exception);
      res.status(status).json({
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'internal_error',
      message: 'Internal server error',
    });
  }
}

function mapDomainErrorStatus(err: DomainError): number {
  if (err instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (err instanceof ConflictError) return HttpStatus.CONFLICT;
  if (err instanceof InvariantViolation) return HttpStatus.BAD_REQUEST;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}
