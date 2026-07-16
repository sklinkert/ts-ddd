import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Money } from '../../../../shared/domain/money';
import { Product } from '../../domain/product';
import { ProductId } from '../../domain/product-id';
import { ProductRepository } from '../../domain/product.repository';
import { SellerId } from '../../../seller/domain/seller-id';
import { SellerNotFound } from '../../../seller/domain/errors';
import { SellerRepository } from '../../../seller/domain/seller.repository';
import { CreateProductCommand } from './create-product.command';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand, ProductId> {
  constructor(
    private readonly products: ProductRepository,
    private readonly sellers: SellerRepository,
    private readonly em: EntityManager,
  ) {}

  async execute(cmd: CreateProductCommand): Promise<ProductId> {
    return this.em.transactional(async () => {
      const sellerId = SellerId(cmd.sellerId);
      const seller = await this.sellers.findById(sellerId);
      if (!seller) throw new SellerNotFound(cmd.sellerId);

      const product = Product.create({
        sellerId,
        name: cmd.name,
        price: Money.of(cmd.priceCents, cmd.currency),
      });
      const saved = await this.products.save(product.toValidated());
      return saved.id;
    });
  }
}
