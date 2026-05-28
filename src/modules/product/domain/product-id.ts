import { Brand, assertUuid, newUuid } from '../../../shared/domain/branded-id';

export type ProductId = Brand<string, 'ProductId'>;

export function ProductId(value: string): ProductId {
  assertUuid(value, 'ProductId');
  return value as ProductId;
}

export function newProductId(): ProductId {
  return newUuid() as ProductId;
}
