import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvariantViolation } from '../../../shared/domain/errors';
import { Money } from '../../../shared/domain/money';
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
  price: Money;
}

export interface ProductRehydrateProps {
  id: ProductId;
  sellerId: SellerId;
  name: string;
  price: Money;
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends AggregateRoot {
  private constructor(
    private readonly _id: ProductId,
    private readonly _sellerId: SellerId,
    private _name: string,
    private _price: Money,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super();
  }

  static create(props: ProductCreateProps): Product {
    const now = new Date();
    const id = newProductId();
    const product = new Product(id, props.sellerId, props.name, props.price, now, now);
    product.validate();
    product.recordEvent(
      new ProductCreatedEvent({
        productId: id,
        sellerId: props.sellerId,
        name: product._name,
        price: product._price,
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
      props.price,
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

  get price(): Money {
    return this._price;
  }

  get priceCents(): number {
    return this._price.amountCents;
  }

  get currency(): string {
    return this._price.currency;
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

  changePrice(price: Money): void {
    if (price.equals(this._price)) return;
    this._price = price;
    this._updatedAt = new Date();
    this.validate();
    this.recordEvent(
      new ProductPriceChangedEvent({
        productId: this._id,
        price,
        occurredAt: this._updatedAt,
      }),
    );
  }

  toValidated(): ValidatedProduct {
    this.validate();
    return ValidatedProduct.__unsafeWrap(this, __validatedProductGuard);
  }

  private validate(): void {
    const trimmed = this._name?.trim() ?? '';
    if (trimmed.length === 0) {
      throw new InvariantViolation('Product name must not be empty');
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      throw new InvariantViolation(`Product name must be at most ${NAME_MAX_LENGTH} characters`);
    }
    // Money validates itself on construction; only presence needs checking here.
    if (!(this._price instanceof Money)) {
      throw new InvariantViolation('Product price must be a Money value object');
    }
  }
}
