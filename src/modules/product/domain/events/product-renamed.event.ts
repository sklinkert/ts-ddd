import { DomainEvent } from '../../../../shared/domain/domain-event';
import { ProductId } from '../product-id';

export class ProductRenamedEvent implements DomainEvent {
  readonly aggregateType = 'Product';
  readonly eventType = 'Product.renamed';
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: { name: string };

  constructor(args: { productId: ProductId; name: string; occurredAt: Date }) {
    this.aggregateId = args.productId;
    this.occurredAt = args.occurredAt;
    this.payload = { name: args.name };
  }
}
