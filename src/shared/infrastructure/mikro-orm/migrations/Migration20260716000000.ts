import { Migration } from '@mikro-orm/migrations';

export class Migration20260716000000 extends Migration {
  async up(): Promise<void> {
    // Default backfills pre-existing rows; new writes always set it explicitly.
    this.addSql(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE products DROP COLUMN IF EXISTS currency;`);
  }
}
