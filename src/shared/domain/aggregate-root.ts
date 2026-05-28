import { DomainEvent } from './domain-event';

export abstract class AggregateRoot {
  private _events: DomainEvent[] = [];

  protected recordEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const out = this._events;
    this._events = [];
    return out;
  }

  hasPendingEvents(): boolean {
    return this._events.length > 0;
  }
}
