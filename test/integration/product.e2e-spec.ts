import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/test-app';

async function createSeller(ctx: TestAppContext): Promise<string> {
  const r = await request(ctx.app.getHttpServer())
    .post('/api/v1/sellers')
    .send({ name: 'Acme', email: 'a@b.co' })
    .expect(201);
  return r.body.id;
}

describe('Product API (integration)', () => {
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

  it('creates a product belonging to a seller', async () => {
    const sellerId = await createSeller(ctx);

    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 1299, currency: 'USD' })
      .expect(201);

    expect(created.body.sellerId).toBe(sellerId);
    expect(created.body.priceCents).toBe(1299);
    expect(created.body.currency).toBe('USD');
  });

  it('rejects creation when seller does not exist', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({
        sellerId: '00000000-0000-7000-8000-000000000000',
        name: 'Widget',
        priceCents: 100,
        currency: 'USD',
      })
      .expect(404);
  });

  it('rejects invalid priceCents at DTO boundary', async () => {
    const sellerId = await createSeller(ctx);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 0, currency: 'USD' })
      .expect(400);
  });

  it('rejects a missing currency', async () => {
    const sellerId = await createSeller(ctx);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 100 })
      .expect(400);
  });

  it('rejects a malformed currency', async () => {
    const sellerId = await createSeller(ctx);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 100, currency: 'usd' })
      .expect(400);
  });

  it('updates name and price', async () => {
    const sellerId = await createSeller(ctx);
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 100, currency: 'USD' })
      .expect(201);

    const updated = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/products/${created.body.id}`)
      .send({ name: 'New Widget', priceCents: 250 })
      .expect(200);

    expect(updated.body.name).toBe('New Widget');
    expect(updated.body.priceCents).toBe(250);
    expect(updated.body.currency).toBe('USD');
  });

  it('changes price and currency together', async () => {
    const sellerId = await createSeller(ctx);
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 100, currency: 'USD' })
      .expect(201);

    const updated = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/products/${created.body.id}`)
      .send({ priceCents: 250, currency: 'EUR' })
      .expect(200);

    expect(updated.body.priceCents).toBe(250);
    expect(updated.body.currency).toBe('EUR');
  });

  it('rejects currency without priceCents', async () => {
    const sellerId = await createSeller(ctx);
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId, name: 'Widget', priceCents: 100, currency: 'USD' })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/products/${created.body.id}`)
      .send({ currency: 'EUR' })
      .expect(400);
  });

  it('lists products filtered by sellerId', async () => {
    const seller1 = await createSeller(ctx);
    const seller2Resp = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Beta', email: 'b@c.co' })
      .expect(201);
    const seller2 = seller2Resp.body.id;

    await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId: seller1, name: 'A', priceCents: 100, currency: 'USD' })
      .expect(201);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/products')
      .send({ sellerId: seller2, name: 'B', priceCents: 200, currency: 'USD' })
      .expect(201);

    const list = await request(ctx.app.getHttpServer())
      .get(`/api/v1/products?sellerId=${seller1}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].sellerId).toBe(seller1);
  });
});
