import { Seller } from './seller';
import { SellerId } from './seller-id';
import { ValidatedSeller } from './validated-seller';

export interface ListSellersFilter {
  limit?: number;
  offset?: number;
}

export abstract class SellerRepository {
  abstract findById(id: SellerId): Promise<Seller | null>;
  abstract list(filter: ListSellersFilter): Promise<Seller[]>;
  abstract save(seller: ValidatedSeller): Promise<Seller>;
  abstract delete(id: SellerId): Promise<void>;
}
