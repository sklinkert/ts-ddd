import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';

export interface TestAppContext {
  app: INestApplication;
  orm: MikroORM;
  truncate: () => Promise<void>;
  close: () => Promise<void>;
}

export async function createTestApp(
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestAppContext> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customize) builder = customize(builder);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const orm = app.get(MikroORM);

  const truncate = async () => {
    await orm.em
      .getConnection()
      .execute(
        'TRUNCATE TABLE products, sellers, outbox, idempotency_records RESTART IDENTITY CASCADE',
      );
  };

  const close = async () => {
    await app.close();
  };

  return { app, orm, truncate, close };
}
