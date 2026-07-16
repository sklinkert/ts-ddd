import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { stringify } from 'yaml';

// Boot the app without a database so the spec can be generated anywhere
// (CI, pre-commit) — must be set before AppModule loads the ORM config.
process.env.MIKRO_ORM_CONNECT = 'false';

async function main(): Promise<void> {
  const { AppModule } = await import('../src/app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('ts-ddd')
    .setDescription(
      'Opinionated Nest.js / TypeScript DDD template — Seller and Product aggregates ' +
        'with CQRS, transactional outbox, and idempotent writes.',
    )
    .setVersion(process.env.npm_package_version ?? '0.1.0')
    .addTag('sellers')
    .addTag('products')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Global prefix is applied in configureApp() at runtime; mirror it here.
  const prefixed = {
    ...document,
    paths: Object.fromEntries(
      Object.entries(document.paths).map(([path, item]) => [`/api/v1${path}`, item]),
    ),
  };

  const outPath = resolve(__dirname, '../api/openapi.yaml');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, stringify(prefixed, { aliasDuplicateObjects: false }));
  await app.close();
  process.stdout.write(`wrote ${outPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
