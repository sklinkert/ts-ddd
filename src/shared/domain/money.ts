import { InvariantViolation } from './errors';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * Money value object: an integer amount in minor units (cents) plus an
 * ISO 4217 currency code. Immutable; equality is by value. Never store
 * money as a float.
 */
export class Money {
  private constructor(
    private readonly _amountCents: number,
    private readonly _currency: string,
  ) {
    Object.freeze(this);
  }

  static of(amountCents: number, currency: string): Money {
    if (!Number.isSafeInteger(amountCents)) {
      throw new InvariantViolation('Money amountCents must be a safe integer');
    }
    if (amountCents <= 0) {
      throw new InvariantViolation('Money amountCents must be greater than 0');
    }
    if (!CURRENCY_PATTERN.test(currency)) {
      throw new InvariantViolation(
        'Money currency must be a three-letter uppercase ISO 4217 code (e.g. "USD")',
      );
    }
    return new Money(amountCents, currency);
  }

  get amountCents(): number {
    return this._amountCents;
  }

  get currency(): string {
    return this._currency;
  }

  equals(other: Money): boolean {
    return this._amountCents === other._amountCents && this._currency === other._currency;
  }

  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new InvariantViolation(
        `Cannot add money in different currencies (${this._currency} + ${other._currency})`,
      );
    }
    return Money.of(this._amountCents + other._amountCents, this._currency);
  }

  toJSON(): { amountCents: number; currency: string } {
    return { amountCents: this._amountCents, currency: this._currency };
  }
}
