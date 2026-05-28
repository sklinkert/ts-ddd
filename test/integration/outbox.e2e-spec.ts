import request from 'supertest';
import { OutboxPublisher } from '../../src/shared/infrastructure/outbox/outbox.publisher';
import {
  IntegrationEventDispatcher,
} from '../../src/shared/infrastructure/outbox/integration-event-dispatcher';
import { IntegrationEvent } from '../../src/shared/infrastructure/outbox/integration-event';
import { createTestApp, TestAppContext } from './setup/test-app';

class RecordingDispatcher extends IntegrationEventDispatcher {
  received: IntegrationEvent[] = [];
  shouldFail = false;

  async dispatch(event: IntegrationEvent): Promise<void> {
    if (this.shouldFail) throw new Error('downstream subscriber boom');
    this.received.push(event);
  }
}

describe('Outbox (integration)', () => {
  let ctx: TestAppContext;
  let dispatcher: RecordingDispatcher;

  beforeAll(async () => {
    dispatcher = new RecordingDispatcher();
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(IntegrationEventDispatcher).useValue(dispatcher),
    );
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.truncate();
    dispatcher.received = [];
    dispatcher.shouldFail = false;
  });

  it('persists the outbox row in the same transaction as the aggregate', async () => {
    // Create seller without running the publisher — the row must already be there.
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'a@b.co' })
      .expect(201);

    type Row = { aggregate_id: string; event_type: string; published_at: Date | null };
    const rows = await ctx.orm.em
      .getConnection()
      .execute<Row[]>('SELECT aggregate_id, event_type, published_at FROM outbox');

    const sellerCreated = rows.find((r: Row) => r.event_type === 'Seller.created');
    expect(sellerCreated).toBeDefined();
    expect(sellerCreated!.aggregate_id).toBe(created.body.id);
    expect(sellerCreated!.published_at).toBeNull();
  });

  it('publishes pending rows via the dispatcher and marks them sent', async () => {
    const created = await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'a@b.co' })
      .expect(201);

    const publisher = ctx.app.get(OutboxPublisher);
    const publishedCount = await publisher.tick();

    expect(publishedCount).toBeGreaterThanOrEqual(1);
    expect(
      dispatcher.received.some(
        (e) => e.eventType === 'Seller.created' && e.aggregateId === created.body.id,
      ),
    ).toBe(true);

    const remaining = await ctx.orm.em
      .getConnection()
      .execute<{ count: string }[]>(
        'SELECT count(*)::text AS count FROM outbox WHERE published_at IS NULL',
      );
    expect(remaining[0].count).toBe('0');
  });

  it('keeps rows pending and increments attempts when the dispatcher fails', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'a@b.co' })
      .expect(201);

    dispatcher.shouldFail = true;
    const publisher = ctx.app.get(OutboxPublisher);
    const published = await publisher.tick();
    expect(published).toBe(0);

    const rows = await ctx.orm.em
      .getConnection()
      .execute<{ published_at: Date | null; attempts: number; claimed_at: Date | null }[]>(
        'SELECT published_at, attempts, claimed_at FROM outbox',
      );
    expect(rows[0].published_at).toBeNull();
    expect(Number(rows[0].attempts)).toBe(1);
    expect(rows[0].claimed_at).toBeNull();
  });

  it('does not hold a row lock across dispatch', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/sellers')
      .send({ name: 'Acme', email: 'a@b.co' })
      .expect(201);

    let dispatchStarted!: () => void;
    const dispatchStartedPromise = new Promise<void>((resolve) => {
      dispatchStarted = resolve;
    });
    const releaseDispatch = new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });

    const slowDispatcher: IntegrationEventDispatcher = {
      async dispatch() {
        dispatchStarted();
        await releaseDispatch;
      },
    };
    const publisher = new OutboxPublisher(ctx.orm.em as never, slowDispatcher);

    const tickPromise = publisher.tick();
    await dispatchStartedPromise;

    // While the dispatcher is mid-flight, the row should NOT be locked —
    // a concurrent read must succeed.
    const start = Date.now();
    const readRows = await ctx.orm.em
      .getConnection()
      .execute<{ id: string; claimed_at: Date | null }[]>('SELECT id, claimed_at FROM outbox');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(readRows[0].claimed_at).not.toBeNull();

    await tickPromise;
  });
});
