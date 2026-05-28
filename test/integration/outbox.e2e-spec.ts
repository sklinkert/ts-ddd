import request from 'supertest';
import { EventBus } from '@nestjs/cqrs';
import { OutboxPublisher } from '../../src/shared/infrastructure/outbox/outbox.publisher';
import { IntegrationEvent } from '../../src/shared/infrastructure/outbox/integration-event';
import { createTestApp, TestAppContext } from './setup/test-app';

describe('Outbox (integration)', () => {
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

  it('writes a pending row on aggregate save and publishes on tick', async () => {
    const published: IntegrationEvent[] = [];
    const eventBus = ctx.app.get(EventBus);
    const subscription = eventBus.subscribe((event) => {
      if (event instanceof IntegrationEvent) published.push(event);
    });

    try {
      const created = await request(ctx.app.getHttpServer())
        .post('/api/v1/sellers')
        .send({ name: 'Acme', email: 'a@b.co' })
        .expect(201);

      const pendingBefore = await ctx.orm.em
        .getConnection()
        .execute<{ count: string }[]>('SELECT count(*)::text AS count FROM outbox WHERE published_at IS NULL');
      expect(Number(pendingBefore[0].count)).toBeGreaterThanOrEqual(1);

      const publisher = ctx.app.get(OutboxPublisher);
      const publishedCount = await publisher.tick();
      expect(publishedCount).toBeGreaterThanOrEqual(1);

      const pendingAfter = await ctx.orm.em
        .getConnection()
        .execute<{ count: string }[]>('SELECT count(*)::text AS count FROM outbox WHERE published_at IS NULL');
      expect(Number(pendingAfter[0].count)).toBe(0);

      expect(published.some((e) => e.eventType === 'Seller.created' && e.aggregateId === created.body.id)).toBe(true);
    } finally {
      subscription.unsubscribe();
    }
  });
});
