import { Seller } from '../../../src/modules/seller/domain/seller';
import { InvariantViolation } from '../../../src/shared/domain/errors';
import { SellerCreatedEvent } from '../../../src/modules/seller/domain/events/seller-created.event';
import { SellerRenamedEvent } from '../../../src/modules/seller/domain/events/seller-renamed.event';

describe('Seller aggregate', () => {
  describe('create', () => {
    it('produces a Seller with valid input and emits SellerCreatedEvent', () => {
      const seller = Seller.create({ name: 'Acme', email: 'a@b.co' });
      expect(seller.name).toBe('Acme');
      expect(seller.email).toBe('a@b.co');
      const events = seller.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SellerCreatedEvent);
      expect(events[0].aggregateId).toBe(seller.id);
    });

    it('rejects empty name', () => {
      expect(() => Seller.create({ name: '', email: 'a@b.co' })).toThrow(InvariantViolation);
      expect(() => Seller.create({ name: '   ', email: 'a@b.co' })).toThrow(InvariantViolation);
    });

    it('rejects too-long name', () => {
      expect(() => Seller.create({ name: 'x'.repeat(121), email: 'a@b.co' })).toThrow(
        InvariantViolation,
      );
    });

    it('rejects invalid email', () => {
      expect(() => Seller.create({ name: 'Acme', email: 'not-an-email' })).toThrow(
        InvariantViolation,
      );
    });
  });

  describe('rename', () => {
    it('updates name and records SellerRenamedEvent', () => {
      const seller = Seller.create({ name: 'Old', email: 'a@b.co' });
      seller.pullDomainEvents();
      seller.rename('New');
      expect(seller.name).toBe('New');
      const events = seller.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SellerRenamedEvent);
    });

    it('is a no-op when name is unchanged', () => {
      const seller = Seller.create({ name: 'Same', email: 'a@b.co' });
      seller.pullDomainEvents();
      seller.rename('Same');
      expect(seller.pullDomainEvents()).toHaveLength(0);
    });

    it('rejects invalid new name', () => {
      const seller = Seller.create({ name: 'Old', email: 'a@b.co' });
      expect(() => seller.rename('')).toThrow(InvariantViolation);
    });
  });

  describe('toValidated', () => {
    it('produces a ValidatedSeller wrapping this aggregate', () => {
      const seller = Seller.create({ name: 'Acme', email: 'a@b.co' });
      const validated = seller.toValidated();
      expect(validated.seller).toBe(seller);
    });
  });
});
