import 'reflect-metadata';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SellerOrmEntity } from './modules/seller/infrastructure/persistence/seller.orm-entity';
import { ProductOrmEntity } from './modules/product/infrastructure/persistence/product.orm-entity';
import { OutboxOrmEntity } from './shared/infrastructure/outbox/outbox.orm-entity';
import { IdempotencyOrmEntity } from './shared/infrastructure/idempotency/idempotency.orm-entity';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/ts_ddd';

export default defineConfig({
  clientUrl: databaseUrl,
  entities: [SellerOrmEntity, ProductOrmEntity, OutboxOrmEntity, IdempotencyOrmEntity],
  extensions: [Migrator],
  migrations: {
    path: './src/shared/infrastructure/mikro-orm/migrations',
    pathTs: './src/shared/infrastructure/mikro-orm/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    emit: 'ts',
  },
  debug: process.env.MIKRO_ORM_DEBUG === 'true',
  forceUtcTimezone: true,
});
