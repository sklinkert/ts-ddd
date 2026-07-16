import { Money } from '../../../src/shared/domain/money';
import { InvariantViolation } from '../../../src/shared/domain/errors';

describe('Money value object', () => {
  describe('of', () => {
    it('builds from integer cents and an ISO currency code', () => {
      const m = Money.of(1299, 'USD');
      expect(m.amountCents).toBe(1299);
      expect(m.currency).toBe('USD');
    });

    it.each([12.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
      'rejects non-safe-integer amount %p',
      (amount) => {
        expect(() => Money.of(amount, 'USD')).toThrow(InvariantViolation);
      },
    );

    it.each([0, -1])('rejects non-positive amount %p', (amount) => {
      expect(() => Money.of(amount, 'USD')).toThrow(InvariantViolation);
    });

    it.each(['usd', 'US', 'USDT', '', 'U$D'])('rejects malformed currency %p', (currency) => {
      expect(() => Money.of(100, currency)).toThrow(InvariantViolation);
    });
  });

  describe('equals', () => {
    it('is value equality', () => {
      expect(Money.of(100, 'USD').equals(Money.of(100, 'USD'))).toBe(true);
      expect(Money.of(100, 'USD').equals(Money.of(101, 'USD'))).toBe(false);
      expect(Money.of(100, 'USD').equals(Money.of(100, 'EUR'))).toBe(false);
    });
  });

  describe('add', () => {
    it('adds amounts in the same currency', () => {
      expect(Money.of(100, 'USD').add(Money.of(50, 'USD')).amountCents).toBe(150);
    });

    it('rejects mixed currencies', () => {
      expect(() => Money.of(100, 'USD').add(Money.of(50, 'EUR'))).toThrow(InvariantViolation);
    });
  });

  it('is immutable', () => {
    const m = Money.of(100, 'USD');
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('serializes to plain JSON', () => {
    expect(JSON.parse(JSON.stringify(Money.of(100, 'USD')))).toEqual({
      amountCents: 100,
      currency: 'USD',
    });
  });
});
