import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/test-app';

describe('Health probes (integration)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /healthz answers outside the api prefix', async () => {
    const r = await request(ctx.app.getHttpServer()).get('/healthz').expect(200);
    expect(r.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz confirms database connectivity', async () => {
    const r = await request(ctx.app.getHttpServer()).get('/readyz').expect(200);
    expect(r.body).toEqual({ status: 'ok' });
  });

  it('probes are not served under /api/v1', async () => {
    await request(ctx.app.getHttpServer()).get('/api/v1/healthz').expect(404);
  });
});
