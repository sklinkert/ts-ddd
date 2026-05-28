import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { IdempotencyService } from './idempotency.service';

const ONE_HOUR_MS = 60 * 60 * 1000;
const DEFAULT_RETENTION_MS = 24 * ONE_HOUR_MS;

/**
 * Periodically prunes completed idempotency records older than the retention
 * window. The window should be at least as long as the longest expected
 * client retry interval. Pending (in-flight) rows are left alone — they
 * are released by the middleware on success/failure.
 */
@Injectable()
export class IdempotencyCleanupJob {
  private readonly logger = new Logger(IdempotencyCleanupJob.name);
  private readonly retentionMs: number;

  constructor(private readonly idempotency: IdempotencyService) {
    const fromEnv = Number(process.env.IDEMPOTENCY_RETENTION_MS);
    this.retentionMs = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_RETENTION_MS;
  }

  @Interval('idempotency.cleanup', ONE_HOUR_MS)
  async run(): Promise<void> {
    try {
      const deleted = await this.idempotency.cleanupOlderThan(this.retentionMs);
      if (deleted > 0) {
        this.logger.log(`Pruned ${deleted} idempotency records older than ${this.retentionMs}ms`);
      }
    } catch (err) {
      this.logger.error(
        'Idempotency cleanup failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
