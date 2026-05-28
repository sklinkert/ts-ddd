import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/test-app';

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

    // Wait for the async record() write in res.on('finish') to land
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

    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .set('Idempotency-Key', KEY)
      .send({ name: 'Different', email: 'acme@example.com' })
      .expect(409);
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
});
