import { Seller } from '../../../domain/seller';

export interface SellerResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export function toSellerResponse(seller: Seller): SellerResponse {
  return {
    id: seller.id,
    name: seller.name,
    email: seller.email,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
  };
}
