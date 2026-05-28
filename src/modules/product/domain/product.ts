import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvariantViolation } from '../../../shared/domain/errors';
import { SellerId } from '../../seller/domain/seller-id';
import { ProductCreatedEvent } from './events/product-created.event';
import { ProductPriceChangedEvent } from './events/product-price-changed.event';
import { ProductRenamedEvent } from './events/product-renamed.event';
import { newProductId, ProductId } from './product-id';
import { __validatedProductGuard, ValidatedProduct } from './validated-product';

const NAME_MAX_LENGTH = 120;

export interface ProductCreateProps {
  sellerId: SellerId;
  name: string;
  priceCents: number;
}

export interface ProductRehydrateProps {
  id: ProductId;
  sellerId: SellerId;
  name: string;
  priceCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends AggregateRoot {
  private constructor(
    private readonly _id: ProductId,
    private readonly _sellerId: SellerId,
    private _name: string,
    private _priceCents: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super();
  }

  static create(props: ProductCreateProps): Product {
    const now = new Date();
    const id = newProductId();
    const product = new Product(id, props.sellerId, props.name, props.priceCents, now, now);
    product.validate();
    product.recordEvent(
      new ProductCreatedEvent({
        productId: id,
        sellerId: props.sellerId,
        name: product._name,
        priceCents: product._priceCents,
        occurredAt: now,
      }),
    );
    return product;
  }

  static rehydrate(props: ProductRehydrateProps): Product {
    const product = new Product(
      props.id,
      props.sellerId,
      props.name,
      props.priceCents,
      props.createdAt,
      props.updatedAt,
    );
    product.validate();
    return product;
  }

  get id(): ProductId {
    return this._id;
  }

  get sellerId(): SellerId {
    return this._sellerId;
  }

  get name(): string {
    return this._name;
  }

  get priceCents(): number {
    return this._priceCents;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rename(name: string): void {
    if (name === this._name) return;
    this._name = name;
    this._updatedAt = new Date();
    this.validate();
    this.recordEvent(
      new ProductRenamedEvent({ productId: this._id, name, occurredAt: this._updatedAt }),
    );
  }

  changePrice(priceCents: number): void {
    if (priceCents === this._priceCents) return;
    this._priceCents = priceCents;
    this._updatedAt = new Date();
    this.validate();
    this.recordEvent(
      new ProductPriceChangedEvent({
        productId: this._id,
        priceCents,
        occurredAt: this._updatedAt,
      }),
    );
  }

  toValidated(): ValidatedProduct {
    this.validate();
    return ValidatedProduct.__unsafeWrap(this, __validatedProductGuard);
  }

  private validate(): void {
    const name = this._name?.trim() ?? '';
    if (name.length === 0) {
      throw new InvariantViolation('Product name must not be empty');
    }
    if (this._name.length > NAME_MAX_LENGTH) {
      throw new InvariantViolation(`Product name must be at most ${NAME_MAX_LENGTH} characters`);
    }
    if (!Number.isInteger(this._priceCents)) {
      throw new InvariantViolation('Product priceCents must be an integer');
    }
    if (this._priceCents <= 0) {
      throw new InvariantViolation('Product priceCents must be greater than 0');
    }
  }
}
