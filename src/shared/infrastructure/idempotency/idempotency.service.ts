import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { IdempotencyOrmEntity } from './idempotency.orm-entity';

export interface CachedResponse {
  status: number;
  body: unknown;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly em: EntityManager) {}

  hashRequest(body: unknown): string {
    const json = body === undefined || body === null ? '' : JSON.stringify(body);
    return createHash('sha256').update(json).digest('hex');
  }

  async lookup(
    key: string,
    method: string,
    path: string,
    requestHash: string,
  ): Promise<{ kind: 'miss' } | { kind: 'hit'; response: CachedResponse } | { kind: 'conflict' }> {
    const em = this.em.fork();
    const row = await em.findOne(IdempotencyOrmEntity, { key, method, path });
    if (!row) return { kind: 'miss' };
    if (row.requestHash !== requestHash) return { kind: 'conflict' };
    return { kind: 'hit', response: { status: row.responseStatus, body: row.responseBody } };
  }

  async record(
    key: string,
    method: string,
    path: string,
    requestHash: string,
    status: number,
    body: unknown,
  ): Promise<void> {
    const em = this.em.fork();
    await em
      .getConnection()
      .execute(
        `INSERT INTO idempotency_records (key, method, path, request_hash, response_status, response_body, created_at)
         VALUES (?, ?, ?, ?, ?, ?::jsonb, now())
         ON CONFLICT (key, method, path) DO NOTHING`,
        [key, method, path, requestHash, status, JSON.stringify(body ?? null)],
      );
  }
}
