import { AggregateRoot } from '../../../src/shared/domain/aggregate-root';
import { DomainEvent } from '../../../src/shared/domain/domain-event';

class TestAggregate extends AggregateRoot {
  fire(event: DomainEvent) {
    this.recordEvent(event);
  }
}

const sampleEvent = (id: string): DomainEvent => ({
  aggregateType: 'Test',
  aggregateId: id,
  eventType: 'Test.fired',
  occurredAt: new Date('2026-05-28T00:00:00Z'),
  payload: {},
});

describe('AggregateRoot', () => {
  it('starts with no pending events', () => {
    const agg = new TestAggregate();
    expect(agg.hasPendingEvents()).toBe(false);
    expect(agg.pullDomainEvents()).toEqual([]);
  });

  it('records events in order', () => {
    const agg = new TestAggregate();
    agg.fire(sampleEvent('a'));
    agg.fire(sampleEvent('b'));
    expect(agg.hasPendingEvents()).toBe(true);
    const events = agg.pullDomainEvents();
    expect(events.map((e) => e.aggregateId)).toEqual(['a', 'b']);
  });

  it('clears events on pull', () => {
    const agg = new TestAggregate();
    agg.fire(sampleEvent('a'));
    agg.pullDomainEvents();
    expect(agg.hasPendingEvents()).toBe(false);
    expect(agg.pullDomainEvents()).toEqual([]);
  });
});
