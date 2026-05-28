export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvariantViolation extends DomainError {
  readonly code = 'invariant_violation';
}

export class NotFoundError extends DomainError {
  readonly code = 'not_found';
  constructor(
    readonly aggregateType: string,
    readonly id: string,
  ) {
    super(`${aggregateType} not found: ${id}`);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'conflict';
}
