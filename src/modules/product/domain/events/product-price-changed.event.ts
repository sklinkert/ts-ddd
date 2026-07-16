import { DomainEvent } from '../../../../shared/domain/domain-event';
import { Money } from '../../../../shared/domain/money';
import { ProductId } from '../product-id';

export class ProductPriceChangedEvent implements DomainEvent {
  readonly aggregateType = 'Product';
  readonly eventType = 'Product.priceChanged';
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: { priceCents: number; currency: string };

  constructor(args: { productId: ProductId; price: Money; occurredAt: Date }) {
    this.aggregateId = args.productId;
    this.occurredAt = args.occurredAt;
    this.payload = { priceCents: args.price.amountCents, currency: args.price.currency };
  }
}
