import { v7 as uuidv7, validate as uuidValidate } from 'uuid';

declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Uuid = string;

export function newUuid(): Uuid {
  return uuidv7();
}

export function assertUuid(value: string, label: string): asserts value is Uuid {
  if (!uuidValidate(value)) {
    throw new Error(`${label} is not a valid UUID: ${value}`);
  }
}
