import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  // eslint-disable-next-line no-var
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalTeardown(): Promise<void> {
  const container = global.__PG_CONTAINER__;
  if (container) {
    await container.stop({ remove: true });
  }
}
