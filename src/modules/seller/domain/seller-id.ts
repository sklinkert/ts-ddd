import { Brand, assertUuid, newUuid } from '../../../shared/domain/branded-id';

export type SellerId = Brand<string, 'SellerId'>;

export function SellerId(value: string): SellerId {
  assertUuid(value, 'SellerId');
  return value as SellerId;
}

export function newSellerId(): SellerId {
  return newUuid() as SellerId;
}
