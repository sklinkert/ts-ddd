import { Product } from '../../../src/modules/product/domain/product';
import { ProductCreatedEvent } from '../../../src/modules/product/domain/events/product-created.event';
import { ProductRenamedEvent } from '../../../src/modules/product/domain/events/product-renamed.event';
import { ProductPriceChangedEvent } from '../../../src/modules/product/domain/events/product-price-changed.event';
import { InvariantViolation } from '../../../src/shared/domain/errors';
import { Money } from '../../../src/shared/domain/money';
import { SellerId } from '../../../src/modules/seller/domain/seller-id';
import { newUuid } from '../../../src/shared/domain/branded-id';

const aSellerId = () => SellerId(newUuid());
const usd = (cents: number) => Money.of(cents, 'USD');

describe('Product aggregate', () => {
  describe('create', () => {
    it('builds a Product with valid input and emits ProductCreatedEvent', () => {
      const sellerId = aSellerId();
      const product = Product.create({ sellerId, name: 'Widget', price: usd(1299) });
      expect(product.sellerId).toBe(sellerId);
      expect(product.name).toBe('Widget');
      expect(product.priceCents).toBe(1299);
      expect(product.currency).toBe('USD');
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
      expect((events[0] as ProductCreatedEvent).payload).toMatchObject({
        priceCents: 1299,
        currency: 'USD',
      });
    });

    it('rejects empty name', () => {
      expect(() => Product.create({ sellerId: aSellerId(), name: '', price: usd(100) })).toThrow(
        InvariantViolation,
      );
    });

    it('rejects oversized name', () => {
      expect(() =>
        Product.create({ sellerId: aSellerId(), name: 'x'.repeat(121), price: usd(100) }),
      ).toThrow(InvariantViolation);
    });
  });

  describe('rename', () => {
    it('updates name and records event', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Old', price: usd(100) });
      product.pullDomainEvents();
      product.rename('New');
      expect(product.name).toBe('New');
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductRenamedEvent);
    });
  });

  describe('changePrice', () => {
    it('updates price and records event with currency', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Widget', price: usd(100) });
      product.pullDomainEvents();
      product.changePrice(Money.of(200, 'EUR'));
      expect(product.priceCents).toBe(200);
      expect(product.currency).toBe('EUR');
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductPriceChangedEvent);
      expect((events[0] as ProductPriceChangedEvent).payload).toEqual({
        priceCents: 200,
        currency: 'EUR',
      });
    });

    it('is a no-op for an equal Money value', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Widget', price: usd(100) });
      product.pullDomainEvents();
      product.changePrice(usd(100));
      expect(product.pullDomainEvents()).toHaveLength(0);
    });

    it('emits an event when only the currency changes', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Widget', price: usd(100) });
      product.pullDomainEvents();
      product.changePrice(Money.of(100, 'EUR'));
      expect(product.pullDomainEvents()).toHaveLength(1);
    });
  });
});
