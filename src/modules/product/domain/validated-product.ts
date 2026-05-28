import type { Product } from './product';

export const __validatedProductGuard: unique symbol = Symbol('ValidatedProduct');

export class ValidatedProduct {
  private constructor(public readonly product: Product) {}

  static __unsafeWrap(product: Product, guard: typeof __validatedProductGuard): ValidatedProduct {
    if (guard !== __validatedProductGuard) {
      throw new Error('ValidatedProduct may only be constructed by Product.toValidated()');
    }
    return new ValidatedProduct(product);
  }
}
