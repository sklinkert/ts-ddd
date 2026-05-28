import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Seller } from '../../domain/seller';
import { SellerId } from '../../domain/seller-id';
import { ListSellersFilter, SellerRepository } from '../../domain/seller.repository';
import { ValidatedSeller } from '../../domain/validated-seller';
import { OutboxRecorder } from '../../../../shared/infrastructure/outbox/outbox.recorder';
import { SellerOrmEntity } from './seller.orm-entity';
import { SellerMapper } from './seller.mapper';

@Injectable()
export class MikroOrmSellerRepository extends SellerRepository {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async findById(id: SellerId): Promise<Seller | null> {
    const orm = await this.em.findOne(SellerOrmEntity, { id });
    return orm ? SellerMapper.toDomain(orm) : null;
  }

  async list(filter: ListSellersFilter): Promise<Seller[]> {
    const rows = await this.em.find(
      SellerOrmEntity,
      {},
      { limit: filter.limit ?? 50, offset: filter.offset ?? 0, orderBy: { createdAt: 'asc' } },
    );
    return rows.map(SellerMapper.toDomain);
  }

  async save(validated: ValidatedSeller): Promise<Seller> {
    const seller = validated.seller;
    const em = this.em.getContext();
    const existing = await em.findOne(SellerOrmEntity, { id: seller.id });
    const orm = SellerMapper.toOrm(seller, existing ?? undefined);
    em.persist(orm);
    for (const event of seller.pullDomainEvents()) {
      em.persist(OutboxRecorder.toRow(event));
    }
    await em.flush();
    return SellerMapper.toDomain(orm);
  }

  async delete(id: SellerId): Promise<void> {
    const em = this.em.getContext();
    const orm = await em.findOne(SellerOrmEntity, { id });
    if (orm) {
      em.remove(orm);
      await em.flush();
    }
  }
}
