import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/test-app';

describe('Seller API (integration)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.truncate();
  });

  it('creates a seller and reads it back', async () => {
    const create = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'acme@example.com' })
      .expect(201);

    expect(create.body.id).toMatch(/[0-9a-f-]{36}/);
    expect(create.body.name).toBe('Acme');
    expect(create.body.email).toBe('acme@example.com');

    const get = await request(ctx.app.getHttpServer())
      .get(`/api/v1/sellers/${create.body.id}`)
      .expect(200);
    expect(get.body.id).toBe(create.body.id);
  });

  it('rejects invalid email at the DTO boundary', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'nope' })
      .expect(400);
  });

  it('returns 404 for missing seller', async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/v1/sellers/00000000-0000-7000-8000-000000000000')
      .expect(404);
  });

  it('renames a seller', async () => {
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Old', email: 'a@b.co' })
      .expect(201);

    const renamed = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/sellers/${created.body.id}/name`)
      .send({ name: 'New' })
      .expect(200);
    expect(renamed.body.name).toBe('New');
  });

  it('writes a SellerCreatedEvent to the outbox', async () => {
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'a@b.co' })
      .expect(201);

    type OutboxRow = { aggregate_id: string; event_type: string; published_at: Date | null };
    const rows = await ctx.orm.em
      .getConnection()
      .execute<OutboxRow[]>('SELECT aggregate_id, event_type, published_at FROM outbox');

    const sellerCreated = rows.find((r: OutboxRow) => r.event_type === 'Seller.created');
    expect(sellerCreated).toBeDefined();
    expect(sellerCreated!.aggregate_id).toBe(created.body.id);
  });
});
