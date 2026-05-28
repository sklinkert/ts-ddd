import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  // eslint-disable-next-line no-var
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('ts_ddd_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const url = `postgres://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getMappedPort(
    5432,
  )}/${container.getDatabase()}`;

  process.env.DATABASE_URL = url;
  (globalThis as { __PG_CONTAINER_URL__?: string }).__PG_CONTAINER_URL__ = url;
  global.__PG_CONTAINER__ = container;

  const { MikroORM } = await import('@mikro-orm/postgresql');
  const { default: config } = await import('../../../src/mikro-orm.config');
  const orm = await MikroORM.init({ ...config, clientUrl: url });
  await orm.getMigrator().up();
  await orm.close(true);
}
