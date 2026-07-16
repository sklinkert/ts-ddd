import { Product } from '../../../src/modules/product/domain/product';
import { ProductMapper } from '../../../src/modules/product/infrastructure/persistence/product.mapper';
import { Money } from '../../../src/shared/domain/money';
import { SellerId } from '../../../src/modules/seller/domain/seller-id';
import { newUuid } from '../../../src/shared/domain/branded-id';

describe('ProductMapper', () => {
  it('round-trips a Product through ORM entity', () => {
    const product = Product.create({
      sellerId: SellerId(newUuid()),
      name: 'Widget',
      price: Money.of(1299, 'USD'),
    });
    const orm = ProductMapper.toOrm(product);
    const restored = ProductMapper.toDomain(orm);

    expect(restored.id).toBe(product.id);
    expect(restored.sellerId).toBe(product.sellerId);
    expect(restored.name).toBe(product.name);
    expect(restored.priceCents).toBe(product.priceCents);
    expect(restored.currency).toBe('USD');
  });

  it('converts bigint string priceCents to number on read', () => {
    const product = Product.create({
      sellerId: SellerId(newUuid()),
      name: 'Widget',
      price: Money.of(100, 'EUR'),
    });
    const orm = ProductMapper.toOrm(product);
    orm.priceCents = '12345';
    const restored = ProductMapper.toDomain(orm);
    expect(restored.priceCents).toBe(12345);
    expect(restored.currency).toBe('EUR');
  });
});
