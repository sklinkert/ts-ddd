import { Migration } from '@mikro-orm/migrations';

export class Migration20260528000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS sellers (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY,
        seller_id uuid NOT NULL,
        name text NOT NULL,
        price_cents bigint NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS products_seller_idx ON products (seller_id);`);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS outbox (
        id uuid PRIMARY KEY,
        aggregate_type text NOT NULL,
        aggregate_id uuid NOT NULL,
        event_type text NOT NULL,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL,
        published_at timestamptz NULL,
        attempts integer NOT NULL DEFAULT 0
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (published_at, occurred_at);`,
    );

    this.addSql(`
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
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS idempotency_records;`);
    this.addSql(`DROP TABLE IF EXISTS outbox;`);
    this.addSql(`DROP TABLE IF EXISTS products;`);
    this.addSql(`DROP TABLE IF EXISTS sellers;`);
  }
}
