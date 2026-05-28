import { DomainEvent } from '../../../../shared/domain/domain-event';
import { ProductId } from '../product-id';

export class ProductPriceChangedEvent implements DomainEvent {
  readonly aggregateType = 'Product';
  readonly eventType = 'Product.priceChanged';
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: { priceCents: number };

  constructor(args: { productId: ProductId; priceCents: number; occurredAt: Date }) {
    this.aggregateId = args.productId;
    this.occurredAt = args.occurredAt;
    this.payload = { priceCents: args.priceCents };
  }
}
