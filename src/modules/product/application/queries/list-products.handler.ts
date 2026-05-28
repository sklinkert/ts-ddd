import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Product } from '../../domain/product';
import { ProductRepository } from '../../domain/product.repository';
import { SellerId } from '../../../seller/domain/seller-id';
import { ListProductsQuery } from './list-products.query';

@QueryHandler(ListProductsQuery)
export class ListProductsHandler implements IQueryHandler<ListProductsQuery, Product[]> {
  constructor(private readonly products: ProductRepository) {}

  async execute(q: ListProductsQuery): Promise<Product[]> {
    return this.products.list({
      sellerId: q.sellerId ? SellerId(q.sellerId) : undefined,
      limit: q.limit,
      offset: q.offset,
    });
  }
}
