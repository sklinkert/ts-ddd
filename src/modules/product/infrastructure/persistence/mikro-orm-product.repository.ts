import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { Product } from '../../domain/product';
import { ProductId } from '../../domain/product-id';
import { ListProductsFilter, ProductRepository } from '../../domain/product.repository';
import { ValidatedProduct } from '../../domain/validated-product';
import { OutboxRecorder } from '../../../../shared/infrastructure/outbox/outbox.recorder';
import { ProductOrmEntity } from './product.orm-entity';
import { ProductMapper } from './product.mapper';

@Injectable()
export class MikroOrmProductRepository extends ProductRepository {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async findById(id: ProductId): Promise<Product | null> {
    const orm = await this.em.findOne(ProductOrmEntity, { id });
    return orm ? ProductMapper.toDomain(orm) : null;
  }

  async list(filter: ListProductsFilter): Promise<Product[]> {
    const where: FilterQuery<ProductOrmEntity> = filter.sellerId
      ? { sellerId: filter.sellerId }
      : {};
    const rows = await this.em.find(ProductOrmEntity, where, {
      limit: filter.limit ?? 50,
      offset: filter.offset ?? 0,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(ProductMapper.toDomain);
  }

  async save(validated: ValidatedProduct): Promise<Product> {
    const product = validated.product;
    const em = this.em.getContext();
    const existing = await em.findOne(ProductOrmEntity, { id: product.id });
    const orm = ProductMapper.toOrm(product, existing ?? undefined);
    em.persist(orm);
    for (const event of product.pullDomainEvents()) {
      em.persist(OutboxRecorder.toRow(event));
    }
    await em.flush();
    return ProductMapper.toDomain(orm);
  }

  async delete(id: ProductId): Promise<void> {
    const em = this.em.getContext();
    const orm = await em.findOne(ProductOrmEntity, { id });
    if (orm) {
      em.remove(orm);
      await em.flush();
    }
  }
}
