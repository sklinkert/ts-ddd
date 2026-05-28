import { DomainEvent } from '../../../../shared/domain/domain-event';
import { SellerId } from '../seller-id';

export class SellerRenamedEvent implements DomainEvent {
  readonly aggregateType = 'Seller';
  readonly eventType = 'Seller.renamed';
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: { name: string };

  constructor(args: { sellerId: SellerId; name: string; occurredAt: Date }) {
    this.aggregateId = args.sellerId;
    this.occurredAt = args.occurredAt;
    this.payload = { name: args.name };
  }
}
