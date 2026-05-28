import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'products' })
@Index({ name: 'products_seller_idx', properties: ['sellerId'] })
export class ProductOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid' })
  sellerId!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'bigint' })
  priceCents!: string | number;

  @Property({ type: 'timestamptz' })
  createdAt!: Date;

  @Property({ type: 'timestamptz' })
  updatedAt!: Date;
}
