import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const reqId = req.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal error';
    let retryAfterSec: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (Array.isArray(obj.message)) {
          message = obj.message.join(', ');
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        } else if (typeof obj.error === 'string') {
          message = obj.error;
        }
        if (typeof obj.retryAfterSec === 'number') {
          retryAfterSec = obj.retryAfterSec;
        }
      }
    }

    if (status >= 500) {
      this.logger.error({ reqId, err: exception });
      message = 'Internal error';
    }

    if (retryAfterSec) {
      res.setHeader('Retry-After', String(retryAfterSec));
    }

    res.status(status).json({ error: message, reqId });
  }
}
