import { Product } from '../../../src/modules/product/domain/product';
import { ProductMapper } from '../../../src/modules/product/infrastructure/persistence/product.mapper';
import { SellerId } from '../../../src/modules/seller/domain/seller-id';
import { newUuid } from '../../../src/shared/domain/branded-id';

describe('ProductMapper', () => {
  it('round-trips a Product through ORM entity', () => {
    const product = Product.create({
      sellerId: SellerId(newUuid()),
      name: 'Widget',
      priceCents: 1299,
    });
    const orm = ProductMapper.toOrm(product);
    const restored = ProductMapper.toDomain(orm);

    expect(restored.id).toBe(product.id);
    expect(restored.sellerId).toBe(product.sellerId);
    expect(restored.name).toBe(product.name);
    expect(restored.priceCents).toBe(product.priceCents);
  });

  it('converts bigint string priceCents to number on read', () => {
    const product = Product.create({
      sellerId: SellerId(newUuid()),
      name: 'Widget',
      priceCents: 100,
    });
    const orm = ProductMapper.toOrm(product);
    orm.priceCents = '12345';
    const restored = ProductMapper.toDomain(orm);
    expect(restored.priceCents).toBe(12345);
  });
});
