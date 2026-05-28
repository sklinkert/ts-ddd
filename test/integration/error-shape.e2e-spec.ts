import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/test-app';

describe('Error shape (integration)', () => {
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

  it('ValidationPipe errors use {code, message, details}', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: '', email: 'not-an-email' })
      .expect(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        code: 'bad_request',
        message: expect.any(String),
        details: expect.any(Array),
      }),
    );
  });

  it('Domain errors use {code, message}', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/sellers/00000000-0000-7000-8000-000000000000')
      .expect(404);
    expect(res.body).toEqual({
      code: 'not_found',
      message: expect.stringContaining('Seller'),
    });
  });

  it('caps list limit and rejects out-of-range values', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/sellers?limit=99999999')
      .expect(400);
    expect(res.body.code).toBe('bad_request');
  });

  it('rejects negative offset', async () => {
    await request(ctx.app.getHttpServer()).get('/api/v1/sellers?offset=-1').expect(400);
  });
});
