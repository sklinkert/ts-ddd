import type { Seller } from './seller';

export const __validatedSellerGuard: unique symbol = Symbol('ValidatedSeller');

export class ValidatedSeller {
  private constructor(public readonly seller: Seller) {}

  static __unsafeWrap(seller: Seller, guard: typeof __validatedSellerGuard): ValidatedSeller {
    if (guard !== __validatedSellerGuard) {
      throw new Error('ValidatedSeller may only be constructed by Seller.toValidated()');
    }
    return new ValidatedSeller(seller);
  }
}
