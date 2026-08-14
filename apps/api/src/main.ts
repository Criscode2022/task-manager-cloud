import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: process.env.NODE_ENV === 'production',
    }),
  });
  configureApp(app);

  const config = app.get(ConfigService);
  const port = Number(config.get('PORT') || config.get('API_PORT') || 3001);
  await app.listen(port);
  console.log(`Task Cloud Nest API listening on http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/api/health`);
}

bootstrap();
