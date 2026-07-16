import { Money } from '../../../../shared/domain/money';
import { Product } from '../../domain/product';
import { ProductId } from '../../domain/product-id';
import { SellerId } from '../../../seller/domain/seller-id';
import { ProductOrmEntity } from './product.orm-entity';

export class ProductMapper {
  static toDomain(orm: ProductOrmEntity): Product {
    return Product.rehydrate({
      id: ProductId(orm.id),
      sellerId: SellerId(orm.sellerId),
      name: orm.name,
      price: Money.of(toSafeNumber(orm.priceCents, 'priceCents'), orm.currency),
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(product: Product, target?: ProductOrmEntity): ProductOrmEntity {
    const orm = target ?? new ProductOrmEntity();
    orm.id = product.id;
    orm.sellerId = product.sellerId;
    orm.name = product.name;
    orm.priceCents = product.priceCents;
    orm.currency = product.currency;
    orm.createdAt = product.createdAt;
    orm.updatedAt = product.updatedAt;
    return orm;
  }
}

/**
 * Postgres `bigint` is returned either as a JS string or, with some pg driver
 * configurations, as a JS bigint primitive. Domain priceCents is a JS number;
 * convert here and surface an error early if the stored value exceeds
 * Number.MAX_SAFE_INTEGER (which would silently lose precision).
 */
function toSafeNumber(value: string | number | bigint, field: string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new Error(`${field} exceeds Number.MAX_SAFE_INTEGER`);
    }
    return Number(value);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`${field} exceeds Number.MAX_SAFE_INTEGER`);
  }
  return n;
}
