import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'outbox' })
@Index({ name: 'outbox_pending_idx', properties: ['publishedAt', 'occurredAt'] })
export class OutboxOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  aggregateType!: string;

  @Property({ type: 'uuid' })
  aggregateId!: string;

  @Property({ type: 'text' })
  eventType!: string;

  @Property({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Property({ type: 'timestamptz' })
  occurredAt!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null = null;

  @Property({ type: 'integer', default: 0 })
  attempts = 0;
}
