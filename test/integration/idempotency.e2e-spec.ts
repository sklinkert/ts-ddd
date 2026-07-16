import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/test-app';
import { IdempotencyService } from '../../src/shared/infrastructure/idempotency/idempotency.service';

describe('Idempotency (integration)', () => {
  let ctx: TestAppContext;
  const KEY = '11111111-1111-7111-8111-111111111111';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.truncate();
  });

  it('replays the same response when the same Idempotency-Key is reused', async () => {
    const body = { name: 'Acme', email: 'acme@example.com' };

    const first = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body)
      .expect(201);

    // completeClaim is fire-and-forget from res.on('finish'); give it a moment to land.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const second = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body)
      .expect(201);

    expect(second.body).toEqual(first.body);

    const rows = await ctx.orm.em
      .getConnection()
      .execute<{ count: string }[]>('SELECT count(*)::text AS count FROM sellers');
    expect(rows[0].count).toBe('1');
  });

  it('rejects a different body sent with the same Idempotency-Key', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send({ name: 'Acme', email: 'acme@example.com' })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send({ name: 'Different', email: 'acme@example.com' })
      .expect(409);
    expect(res.body.code).toBe('idempotency_conflict');
  });

  it('does not intercept requests without an Idempotency-Key', async () => {
    const a = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'A', email: 'a@b.co' })
      .expect(201);
    const b = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'A', email: 'a@b.co' })
      .expect(201);
    expect(a.body.id).not.toBe(b.body.id);
  });

  it('returns 409 in_flight when a concurrent request races on the same key', async () => {
    // Simulate the in-flight state directly via the service rather than racing
    // two HTTP requests (which would be flaky). A real second request after
    // a winning claim but before the response lands sees this state.
    const idempotency = ctx.app.get(IdempotencyService);
    const body = { name: 'Acme', email: 'a@b.co' };
    const hash = idempotency.hashRequest(body);

    const winner = await idempotency.claim(KEY, 'POST', '/api/v1/sellers', hash);
    expect(winner.kind).toBe('claimed');

    const loser = await idempotency.claim(KEY, 'POST', '/api/v1/sellers', hash);
    expect(loser.kind).toBe('in_flight');

    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body)
      .expect(409);
    expect(res.body.code).toBe('idempotency_in_flight');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('hashes request bodies canonically (key order does not matter)', async () => {
    const body1 = { name: 'Acme', email: 'a@b.co' };
    const body2 = { email: 'a@b.co', name: 'Acme' };

    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body1)
      .expect(201);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const replay = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body2)
      .expect(201);

    const rows = await ctx.orm.em
      .getConnection()
      .execute<{ count: string }[]>('SELECT count(*)::text AS count FROM sellers');
    expect(rows[0].count).toBe('1');
    expect(replay.body.id).toBeDefined();
  });

  it('takes over a stale pending claim left by a crashed process', async () => {
    const body = { name: 'Acme', email: 'a@b.co' };

    // Simulate a crash: a pending row (response_status = 0) older than the TTL
    // whose holder never completed or released it.
    const idempotency = ctx.app.get(IdempotencyService);
    const hash = idempotency.hashRequest(body);
    await ctx.orm.em.getConnection().execute(
      `INSERT INTO idempotency_records (key, method, path, request_hash, response_status, response_body, created_at)
         VALUES (?, 'POST', '/api/v1/sellers', ?, 0, '{}'::jsonb, now() - interval '10 minutes')`,
      [KEY, hash],
    );

    // A crashed holder's stale claim is taken over and the retry succeeds
    // instead of 409ing forever.
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body)
      .expect(201);
  });

  it('cleanupOlderThan deletes completed records past the retention window', async () => {
    const idempotency = ctx.app.get(IdempotencyService);
    const body = { name: 'A', email: 'a@b.co' };
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send(body)
      .expect(201);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Backdate the record so cleanup deletes it.
    await ctx.orm.em
      .getConnection()
      .execute("UPDATE idempotency_records SET created_at = now() - interval '2 days'");

    const deleted = await idempotency.cleanupOlderThan(24 * 60 * 60 * 1000);
    expect(deleted).toBeGreaterThanOrEqual(1);
  });
});
