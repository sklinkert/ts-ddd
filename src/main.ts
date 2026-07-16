import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { JsonLogger } from './shared/infrastructure/logging/json-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  if (process.env.LOG_FORMAT === 'json') {
    app.useLogger(new JsonLogger());
  }

  configureApp(app);
  app.enableShutdownHooks();

  const openapi = new DocumentBuilder()
    .setTitle('ts-ddd')
    .setDescription(
      'Opinionated Nest.js / TypeScript DDD template — Seller and Product aggregates ' +
        'with CQRS, transactional outbox, and idempotent writes.',
    )
    .setVersion(process.env.npm_package_version ?? '0.1.0')
    .addTag('sellers')
    .addTag('products')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openapi));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('bootstrap').log(`listening on :${port} (api under /api/v1, docs under /docs)`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('failed to start server', err);
  process.exitCode = 1;
});
