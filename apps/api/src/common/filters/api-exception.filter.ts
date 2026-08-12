import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
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
    } else if (exception && typeof exception === 'object') {
      const err = exception as { status?: number; message?: string; retryAfterSec?: number };
      if (typeof err.status === 'number') status = err.status;
      if (err.message) message = err.message;
      if (typeof err.retryAfterSec === 'number') retryAfterSec = err.retryAfterSec;
    }

    if (status >= 500) {
      console.error('API error:', exception);
    }

    if (retryAfterSec) {
      res.setHeader('Retry-After', String(retryAfterSec));
    }

    res.status(status).json({ error: message });
  }
}
