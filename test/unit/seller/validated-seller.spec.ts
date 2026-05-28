import {
  ValidatedSeller,
  __validatedSellerGuard,
} from '../../../src/modules/seller/domain/validated-seller';
import { Seller } from '../../../src/modules/seller/domain/seller';

describe('ValidatedSeller', () => {
  it('rejects direct construction at the type system level', () => {
    const seller = Seller.create({ name: 'Acme', email: 'a@b.co' });
    // @ts-expect-error — private constructor is not callable externally; this line
    // would fail to compile if removed, which is the actual guarantee we rely on.
    void (() => new ValidatedSeller(seller));
    expect(true).toBe(true);
  });

  it('rejects wrap calls with wrong guard', () => {
    const seller = Seller.create({ name: 'Acme', email: 'a@b.co' });
    const fakeGuard = Symbol('fake');
    expect(() =>
      (ValidatedSeller.__unsafeWrap as unknown as (s: Seller, g: symbol) => unknown)(
        seller,
        fakeGuard,
      ),
    ).toThrow(/Seller\.toValidated/);
  });

  it('wraps the same Seller instance', () => {
    const seller = Seller.create({ name: 'Acme', email: 'a@b.co' });
    const validated = seller.toValidated();
    expect(validated.seller).toBe(seller);
  });
});
