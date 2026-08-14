import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { isOriginAllowed } from './common/cors';

/**
 * Shared app configuration used by both the standalone server (main.ts)
 * and the Vercel serverless entry (api/index.js at the repo root).
 */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, isOriginAllowed(origin, config));
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  return app;
}
