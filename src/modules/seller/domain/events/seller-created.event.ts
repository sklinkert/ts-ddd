import { DomainEvent } from '../../../../shared/domain/domain-event';
import { SellerId } from '../seller-id';

export class SellerCreatedEvent implements DomainEvent {
  readonly aggregateType = 'Seller';
  readonly eventType = 'Seller.created';
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: { name: string; email: string };

  constructor(args: { sellerId: SellerId; name: string; email: string; occurredAt: Date }) {
    this.aggregateId = args.sellerId;
    this.occurredAt = args.occurredAt;
    this.payload = { name: args.name, email: args.email };
  }
}
