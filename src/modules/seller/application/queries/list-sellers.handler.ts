import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Seller } from '../../domain/seller';
import { SellerRepository } from '../../domain/seller.repository';
import { ListSellersQuery } from './list-sellers.query';

@QueryHandler(ListSellersQuery)
export class ListSellersHandler implements IQueryHandler<ListSellersQuery, Seller[]> {
  constructor(private readonly sellers: SellerRepository) {}

  async execute(q: ListSellersQuery): Promise<Seller[]> {
    return this.sellers.list({ limit: q.limit, offset: q.offset });
  }
}
