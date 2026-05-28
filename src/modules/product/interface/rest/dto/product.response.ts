import { Product } from '../../../domain/product';

export interface ProductResponse {
  id: string;
  sellerId: string;
  name: string;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    sellerId: product.sellerId,
    name: product.name,
    priceCents: product.priceCents,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
