import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SellerId } from '../../domain/seller-id';
import { SellerNotFound } from '../../domain/errors';
import { Seller } from '../../domain/seller';
import { SellerRepository } from '../../domain/seller.repository';
import { GetSellerQuery } from './get-seller.query';

@QueryHandler(GetSellerQuery)
export class GetSellerHandler implements IQueryHandler<GetSellerQuery, Seller> {
  constructor(private readonly sellers: SellerRepository) {}

  async execute(q: GetSellerQuery): Promise<Seller> {
    const seller = await this.sellers.findById(SellerId(q.sellerId));
    if (!seller) throw new SellerNotFound(q.sellerId);
    return seller;
  }
}
