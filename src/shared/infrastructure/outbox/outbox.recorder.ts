import { DomainEvent } from '../../domain/domain-event';
import { newUuid } from '../../domain/branded-id';
import { OutboxOrmEntity } from './outbox.orm-entity';

export class OutboxRecorder {
  static toRow(event: DomainEvent): OutboxOrmEntity {
    const row = new OutboxOrmEntity();
    row.id = newUuid();
    row.aggregateType = event.aggregateType;
    row.aggregateId = event.aggregateId;
    row.eventType = event.eventType;
    row.payload = event.payload;
    row.occurredAt = event.occurredAt;
    row.publishedAt = null;
    row.attempts = 0;
    return row;
  }
}
