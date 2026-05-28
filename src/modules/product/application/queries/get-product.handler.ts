import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Product } from '../../domain/product';
import { ProductId } from '../../domain/product-id';
import { ProductNotFound } from '../../domain/errors';
import { ProductRepository } from '../../domain/product.repository';
import { GetProductQuery } from './get-product.query';

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery, Product> {
  constructor(private readonly products: ProductRepository) {}

  async execute(q: GetProductQuery): Promise<Product> {
    const product = await this.products.findById(ProductId(q.productId));
    if (!product) throw new ProductNotFound(q.productId);
    return product;
  }
}
