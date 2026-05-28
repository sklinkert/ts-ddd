/**
 * Reconstructed event published from the outbox table. Subscribers register against
 * the `eventType` value; the payload mirrors what the aggregate emitted.
 */
export class IntegrationEvent {
  constructor(
    public readonly id: string,
    public readonly aggregateType: string,
    public readonly aggregateId: string,
    public readonly eventType: string,
    public readonly occurredAt: Date,
    public readonly payload: Record<string, unknown>,
  ) {}
}
