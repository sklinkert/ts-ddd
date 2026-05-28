import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { IntegrationEvent } from './integration-event';
import { IntegrationEventDispatcher } from './integration-event-dispatcher';

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

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
    private readonly dispatcher: IntegrationEventDispatcher,
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
    const rows = await this.claimBatch();
    if (rows.length === 0) return 0;

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
        await this.dispatcher.dispatch(event);
        publishedIds.push(row.id);
      } catch (err) {
        failedIds.push(row.id);
        this.logger.warn(
          `Failed to publish outbox row ${row.id} (attempt ${row.attempts + 1}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    await this.markResults(publishedIds, failedIds);
    return publishedIds.length;
  }

  /**
   * Atomically claims a batch of pending (or stale-claimed) rows in a short
   * transaction. The claim is held by `claimed_at`, not by a row lock — so
   * publishing handlers run outside any DB transaction and slow handlers
   * cannot block other workers from making progress on other rows.
   */
  private async claimBatch(): Promise<OutboxRow[]> {
    const em = this.em.fork();
    return em.transactional(async (tx) => {
      return tx.getConnection().execute<OutboxRow[]>(
        `UPDATE outbox
            SET claimed_at = now()
          WHERE id IN (
            SELECT id FROM outbox
             WHERE published_at IS NULL
               AND (claimed_at IS NULL OR claimed_at < now() - (? || ' milliseconds')::interval)
             ORDER BY occurred_at ASC
             LIMIT ?
             FOR UPDATE SKIP LOCKED
          )
          RETURNING id, aggregate_type, aggregate_id, event_type, payload, occurred_at, attempts`,
        [CLAIM_TIMEOUT_MS, BATCH_SIZE],
      );
    });
  }

  private async markResults(publishedIds: string[], failedIds: string[]): Promise<void> {
    if (publishedIds.length === 0 && failedIds.length === 0) return;
    const em = this.em.fork();
    await em.transactional(async (tx) => {
      if (publishedIds.length > 0) {
        const placeholders = publishedIds.map(() => '?').join(',');
        await tx
          .getConnection()
          .execute(
            `UPDATE outbox SET published_at = now(), claimed_at = NULL WHERE id IN (${placeholders})`,
            publishedIds,
          );
      }
      if (failedIds.length > 0) {
        const placeholders = failedIds.map(() => '?').join(',');
        await tx
          .getConnection()
          .execute(
            `UPDATE outbox SET attempts = attempts + 1, claimed_at = NULL WHERE id IN (${placeholders})`,
            failedIds,
          );
      }
    });
  }
}
