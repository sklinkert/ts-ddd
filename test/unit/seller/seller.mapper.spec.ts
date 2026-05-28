import { Seller } from '../../../src/modules/seller/domain/seller';
import { SellerMapper } from '../../../src/modules/seller/infrastructure/persistence/seller.mapper';

describe('SellerMapper', () => {
  it('round-trips a Seller through ORM entity', () => {
    const original = Seller.create({ name: 'Acme', email: 'a@b.co' });
    const orm = SellerMapper.toOrm(original);
    const restored = SellerMapper.toDomain(orm);

    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.email).toBe(original.email);
    expect(restored.createdAt).toEqual(original.createdAt);
    expect(restored.updatedAt).toEqual(original.updatedAt);
  });

  it('does not record domain events when rehydrating', () => {
    const original = Seller.create({ name: 'Acme', email: 'a@b.co' });
    const orm = SellerMapper.toOrm(original);
    const restored = SellerMapper.toDomain(orm);
    expect(restored.hasPendingEvents()).toBe(false);
  });
});
