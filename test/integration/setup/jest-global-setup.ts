import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS sellers (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY,
    seller_id uuid NOT NULL,
    name text NOT NULL,
    price_cents bigint NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  );
  CREATE INDEX IF NOT EXISTS products_seller_idx ON products (seller_id);

  CREATE TABLE IF NOT EXISTS outbox (
    id uuid PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL,
    published_at timestamptz NULL,
    claimed_at timestamptz NULL,
    attempts integer NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (published_at, occurred_at);

  CREATE TABLE IF NOT EXISTS idempotency_records (
    key text NOT NULL,
    method text NOT NULL,
    path text NOT NULL,
    request_hash text NOT NULL,
    response_status integer NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamptz NOT NULL,
    PRIMARY KEY (key, method, path)
  );
  CREATE INDEX IF NOT EXISTS idempotency_created_at_idx ON idempotency_records (created_at);
`;

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

  // Use raw pg to avoid initializing MikroORM in the globalSetup context —
  // that triggers a decorator-metadata realm mismatch in the test workers.
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(SCHEMA_SQL);
  } finally {
    await client.end();
  }
}
