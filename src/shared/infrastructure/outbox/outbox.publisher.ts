import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventBus } from '@nestjs/cqrs';
import { EntityManager } from '@mikro-orm/postgresql';
import { OutboxOrmEntity } from './outbox.orm-entity';
import { IntegrationEvent } from './integration-event';

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: Date;
  attempts: number;
}

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private running = false;

  constructor(
    private readonly em: EntityManager,
    private readonly eventBus: EventBus,
  ) {}

  @Interval('outbox.publish', POLL_INTERVAL_MS)
  async scheduled(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.tick();
    } catch (err) {
      this.logger.error('Outbox tick failed', err instanceof Error ? err.stack : String(err));
    } finally {
      this.running = false;
    }
  }

  async tick(): Promise<number> {
    const em = this.em.fork();
    return em.transactional(async (tx) => {
      const rows = await tx.getConnection().execute<OutboxRow[]>(
        `SELECT id, aggregate_type, aggregate_id, event_type, payload, occurred_at, attempts
         FROM outbox
         WHERE published_at IS NULL
         ORDER BY occurred_at ASC
         LIMIT ?
         FOR UPDATE SKIP LOCKED`,
        [BATCH_SIZE],
      );

      if (rows.length === 0) return 0;

      let published = 0;
      const publishedIds: string[] = [];
      const failedIds: string[] = [];

      for (const row of rows) {
        const event = new IntegrationEvent(
          row.id,
          row.aggregate_type,
          row.aggregate_id,
          row.event_type,
          row.occurred_at,
          row.payload,
        );
        try {
          await this.eventBus.publish(event);
          publishedIds.push(row.id);
          published += 1;
        } catch (err) {
          failedIds.push(row.id);
          this.logger.warn(
            `Failed to publish outbox row ${row.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      if (publishedIds.length > 0) {
        await tx
          .getConnection()
          .execute(`UPDATE outbox SET published_at = now() WHERE id = ANY(?::uuid[])`, [
            publishedIds,
          ]);
      }
      if (failedIds.length > 0) {
        await tx
          .getConnection()
          .execute(`UPDATE outbox SET attempts = attempts + 1 WHERE id = ANY(?::uuid[])`, [
            failedIds,
          ]);
      }

      return published;
    });
  }
}
