import { NotFoundError } from '../../../shared/domain/errors';

export class SellerNotFound extends NotFoundError {
  constructor(id: string) {
    super('Seller', id);
  }
}
