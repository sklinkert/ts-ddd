import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'idempotency_records' })
export class IdempotencyOrmEntity {
  @PrimaryKey({ type: 'text' })
  key!: string;

  @PrimaryKey({ type: 'text' })
  method!: string;

  @PrimaryKey({ type: 'text' })
  path!: string;

  @Property({ type: 'text' })
  requestHash!: string;

  @Property({ type: 'integer' })
  responseStatus!: number;

  @Property({ type: 'jsonb' })
  responseBody!: unknown;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();
}
