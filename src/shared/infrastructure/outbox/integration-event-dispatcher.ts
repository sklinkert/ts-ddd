import { Injectable, Logger } from '@nestjs/common';
import { IntegrationEvent } from './integration-event';

/**
 * Dispatch an integration event to all subscribers and await completion.
 *
 * Unlike `EventBus.publish` from `@nestjs/cqrs`, implementations of this
 * abstract class MUST return a promise that resolves only after every
 * subscriber has completed and reject if any subscriber throws — that
 * propagation is what allows the outbox to provide at-least-once delivery.
 *
 * The default implementation just logs; replace it in your application
 * module with a real dispatcher (e.g. publish to Kafka, call webhook
 * handlers, push to an in-process registry of awaitable subscribers).
 */
export abstract class IntegrationEventDispatcher {
  abstract dispatch(event: IntegrationEvent): Promise<void>;
}

@Injectable()
export class LoggingIntegrationEventDispatcher extends IntegrationEventDispatcher {
  private readonly logger = new Logger(LoggingIntegrationEventDispatcher.name);

  async dispatch(event: IntegrationEvent): Promise<void> {
    this.logger.log(
      `[outbox] ${event.aggregateType}#${event.aggregateId} ${event.eventType}`,
    );
  }
}
