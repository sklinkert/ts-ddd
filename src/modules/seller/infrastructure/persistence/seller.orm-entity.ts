import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'sellers' })
export class SellerOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  email!: string;

  @Property({ type: 'timestamptz' })
  createdAt!: Date;

  @Property({ type: 'timestamptz' })
  updatedAt!: Date;
}
