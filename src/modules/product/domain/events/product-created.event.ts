import { DomainEvent } from '../../../../shared/domain/domain-event';
import { Money } from '../../../../shared/domain/money';
import { ProductId } from '../product-id';
import { SellerId } from '../../../seller/domain/seller-id';

export class ProductCreatedEvent implements DomainEvent {
  readonly aggregateType = 'Product';
  readonly eventType = 'Product.created';
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: { sellerId: string; name: string; priceCents: number; currency: string };

  constructor(args: {
    productId: ProductId;
    sellerId: SellerId;
    name: string;
    price: Money;
    occurredAt: Date;
  }) {
    this.aggregateId = args.productId;
    this.occurredAt = args.occurredAt;
    this.payload = {
      sellerId: args.sellerId,
      name: args.name,
      priceCents: args.price.amountCents,
      currency: args.price.currency,
    };
  }
}
