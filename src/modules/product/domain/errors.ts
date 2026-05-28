import { NotFoundError } from '../../../shared/domain/errors';

export class ProductNotFound extends NotFoundError {
  constructor(id: string) {
    super('Product', id);
  }
}
