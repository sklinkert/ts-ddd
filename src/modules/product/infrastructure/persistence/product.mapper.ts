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
      priceCents: typeof orm.priceCents === 'string' ? Number(orm.priceCents) : orm.priceCents,
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
    orm.createdAt = product.createdAt;
    orm.updatedAt = product.updatedAt;
    return orm;
  }
}
