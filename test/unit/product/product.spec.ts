import { Product } from '../../../src/modules/product/domain/product';
import { ProductCreatedEvent } from '../../../src/modules/product/domain/events/product-created.event';
import { ProductRenamedEvent } from '../../../src/modules/product/domain/events/product-renamed.event';
import { ProductPriceChangedEvent } from '../../../src/modules/product/domain/events/product-price-changed.event';
import { InvariantViolation } from '../../../src/shared/domain/errors';
import { SellerId } from '../../../src/modules/seller/domain/seller-id';
import { newUuid } from '../../../src/shared/domain/branded-id';

const aSellerId = () => SellerId(newUuid());

describe('Product aggregate', () => {
  describe('create', () => {
    it('builds a Product with valid input and emits ProductCreatedEvent', () => {
      const sellerId = aSellerId();
      const product = Product.create({ sellerId, name: 'Widget', priceCents: 1299 });
      expect(product.sellerId).toBe(sellerId);
      expect(product.name).toBe('Widget');
      expect(product.priceCents).toBe(1299);
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
    });

    it('rejects empty name', () => {
      expect(() => Product.create({ sellerId: aSellerId(), name: '', priceCents: 100 })).toThrow(
        InvariantViolation,
      );
    });

    it('rejects oversized name', () => {
      expect(() =>
        Product.create({ sellerId: aSellerId(), name: 'x'.repeat(121), priceCents: 100 }),
      ).toThrow(InvariantViolation);
    });

    it('rejects non-integer price', () => {
      expect(() =>
        Product.create({ sellerId: aSellerId(), name: 'Widget', priceCents: 12.5 }),
      ).toThrow(InvariantViolation);
    });

    it('rejects zero or negative price', () => {
      expect(() => Product.create({ sellerId: aSellerId(), name: 'Widget', priceCents: 0 })).toThrow(
        InvariantViolation,
      );
      expect(() =>
        Product.create({ sellerId: aSellerId(), name: 'Widget', priceCents: -1 }),
      ).toThrow(InvariantViolation);
    });
  });

  describe('rename', () => {
    it('updates name and records event', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Old', priceCents: 100 });
      product.pullDomainEvents();
      product.rename('New');
      expect(product.name).toBe('New');
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductRenamedEvent);
    });
  });

  describe('changePrice', () => {
    it('updates price and records event', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Widget', priceCents: 100 });
      product.pullDomainEvents();
      product.changePrice(200);
      expect(product.priceCents).toBe(200);
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductPriceChangedEvent);
    });

    it('rejects invalid new price', () => {
      const product = Product.create({ sellerId: aSellerId(), name: 'Widget', priceCents: 100 });
      expect(() => product.changePrice(0)).toThrow(InvariantViolation);
    });
  });
});
