import { Seller } from '../../domain/seller';
import { SellerId } from '../../domain/seller-id';
import { SellerOrmEntity } from './seller.orm-entity';

export class SellerMapper {
  static toDomain(orm: SellerOrmEntity): Seller {
    return Seller.rehydrate({
      id: SellerId(orm.id),
      name: orm.name,
      email: orm.email,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(seller: Seller, target?: SellerOrmEntity): SellerOrmEntity {
    const orm = target ?? new SellerOrmEntity();
    orm.id = seller.id;
    orm.name = seller.name;
    orm.email = seller.email;
    orm.createdAt = seller.createdAt;
    orm.updatedAt = seller.updatedAt;
    return orm;
  }
}
