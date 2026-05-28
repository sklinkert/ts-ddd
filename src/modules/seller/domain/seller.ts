import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvariantViolation } from '../../../shared/domain/errors';
import { SellerCreatedEvent } from './events/seller-created.event';
import { SellerRenamedEvent } from './events/seller-renamed.event';
import { newSellerId, SellerId } from './seller-id';
import { ValidatedSeller, __validatedSellerGuard } from './validated-seller';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 120;

export interface SellerCreateProps {
  name: string;
  email: string;
}

export interface SellerRehydrateProps {
  id: SellerId;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Seller extends AggregateRoot {
  private constructor(
    private readonly _id: SellerId,
    private _name: string,
    private _email: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super();
  }

  static create(props: SellerCreateProps): Seller {
    const now = new Date();
    const id = newSellerId();
    const seller = new Seller(id, props.name, props.email, now, now);
    seller.validate();
    seller.recordEvent(
      new SellerCreatedEvent({ sellerId: id, name: seller._name, email: seller._email, occurredAt: now }),
    );
    return seller;
  }

  static rehydrate(props: SellerRehydrateProps): Seller {
    const seller = new Seller(props.id, props.name, props.email, props.createdAt, props.updatedAt);
    seller.validate();
    return seller;
  }

  get id(): SellerId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
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
    this.recordEvent(new SellerRenamedEvent({ sellerId: this._id, name, occurredAt: this._updatedAt }));
  }

  toValidated(): ValidatedSeller {
    this.validate();
    return ValidatedSeller.__unsafeWrap(this, __validatedSellerGuard);
  }

  private validate(): void {
    const name = this._name?.trim() ?? '';
    if (name.length === 0) {
      throw new InvariantViolation('Seller name must not be empty');
    }
    if (this._name.length > NAME_MAX_LENGTH) {
      throw new InvariantViolation(`Seller name must be at most ${NAME_MAX_LENGTH} characters`);
    }
    if (!EMAIL_REGEX.test(this._email)) {
      throw new InvariantViolation(`Seller email is invalid: ${this._email}`);
    }
  }
}
