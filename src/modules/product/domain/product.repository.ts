import { Product } from './product';
import { ProductId } from './product-id';
import { SellerId } from '../../seller/domain/seller-id';
import { ValidatedProduct } from './validated-product';

export interface ListProductsFilter {
  sellerId?: SellerId;
  limit?: number;
  offset?: number;
}

export abstract class ProductRepository {
  abstract findById(id: ProductId): Promise<Product | null>;
  abstract list(filter: ListProductsFilter): Promise<Product[]>;
  abstract save(product: ValidatedProduct): Promise<Product>;
  abstract delete(id: ProductId): Promise<void>;
}
