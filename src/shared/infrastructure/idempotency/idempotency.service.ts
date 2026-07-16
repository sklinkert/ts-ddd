import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

const PENDING_STATUS = 0;
const DEFAULT_PENDING_TTL_MS = 5 * 60 * 1000;

/** After this long, a pending claim is treated as abandoned (holder crashed
 *  before completing or releasing it) and may be taken over by a retry. */
function pendingTtlMs(): number {
  const fromEnv = Number(process.env.IDEMPOTENCY_PENDING_TTL_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_PENDING_TTL_MS;
}

export interface CachedResponse {
  status: number;
  body: unknown;
}

export type ClaimResult =
  | { kind: 'claimed' }
  | { kind: 'replay'; response: CachedResponse }
  | { kind: 'in_flight' }
  | { kind: 'conflict' };

/**
 * Stripe-style idempotency.
 *
 * `claim()` is called BEFORE the handler runs. It atomically inserts a
 * pending row keyed by (key, method, path). The winning request gets
 * `kind: 'claimed'` and proceeds; concurrent requests with the same key
 * either replay a finished response, see an in-flight response (and
 * receive 409 + Retry-After), or hit a hash conflict.
 *
 * A pending row older than IDEMPOTENCY_PENDING_TTL_MS is treated as
 * abandoned (its holder crashed before finishing) and is taken over
 * atomically by the next request instead of returning 409 forever.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly em: EntityManager) {}

  hashRequest(body: unknown): string {
    return createHash('sha256').update(canonicalJson(body)).digest('hex');
  }

  async claim(
    key: string,
    method: string,
    path: string,
    requestHash: string,
  ): Promise<ClaimResult> {
    const em = this.em.fork();

    const inserted = await em.getConnection().execute<{ key: string }[]>(
      `INSERT INTO idempotency_records (key, method, path, request_hash, response_status, response_body, created_at)
         VALUES (?, ?, ?, ?, ?, '{}'::jsonb, now())
         ON CONFLICT (key, method, path) DO UPDATE
           SET request_hash = EXCLUDED.request_hash,
               created_at = now()
         WHERE idempotency_records.response_status = ?
           AND idempotency_records.created_at < now() - (? || ' milliseconds')::interval
         RETURNING key`,
      [key, method, path, requestHash, PENDING_STATUS, PENDING_STATUS, pendingTtlMs()],
    );

    if (inserted.length === 1) {
      return { kind: 'claimed' };
    }

    return this.inspectExisting(key, method, path, requestHash);
  }

  async completeClaim(
    key: string,
    method: string,
    path: string,
    status: number,
    body: unknown,
  ): Promise<void> {
    const em = this.em.fork();
    await em.getConnection().execute(
      `UPDATE idempotency_records
            SET response_status = ?, response_body = ?::jsonb
          WHERE key = ? AND method = ? AND path = ?
            AND response_status = ?`,
      [status, JSON.stringify(body ?? null), key, method, path, PENDING_STATUS],
    );
  }

  async releaseClaim(key: string, method: string, path: string): Promise<void> {
    const em = this.em.fork();
    await em.getConnection().execute(
      `DELETE FROM idempotency_records
          WHERE key = ? AND method = ? AND path = ? AND response_status = ?`,
      [key, method, path, PENDING_STATUS],
    );
  }

  async cleanupOlderThan(ms: number): Promise<number> {
    const em = this.em.fork();
    const rows = await em.getConnection().execute<{ deleted: string }[]>(
      `WITH deleted AS (
           DELETE FROM idempotency_records
            WHERE created_at < now() - (? || ' milliseconds')::interval
              AND response_status <> ?
            RETURNING 1
         )
         SELECT count(*)::text AS deleted FROM deleted`,
      [ms, PENDING_STATUS],
    );
    return Number(rows[0]?.deleted ?? 0);
  }

  private async inspectExisting(
    key: string,
    method: string,
    path: string,
    requestHash: string,
  ): Promise<ClaimResult> {
    const em = this.em.fork();
    const rows = await em
      .getConnection()
      .execute<{ request_hash: string; response_status: number; response_body: unknown }[]>(
        `SELECT request_hash, response_status, response_body
         FROM idempotency_records
        WHERE key = ? AND method = ? AND path = ?`,
        [key, method, path],
      );
    const row = rows[0];
    if (!row) return { kind: 'in_flight' };
    if (row.request_hash !== requestHash) return { kind: 'conflict' };
    if (row.response_status === PENDING_STATUS) return { kind: 'in_flight' };
    return { kind: 'replay', response: { status: row.response_status, body: row.response_body } };
  }
}

/**
 * Canonical JSON: sort object keys recursively before serialization so
 * that semantically identical bodies hash to the same digest regardless
 * of property order chosen by the client.
 */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  );
}
