import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProductId } from '../../domain/product-id';
import { ProductNotFound } from '../../domain/errors';
import { ProductRepository } from '../../domain/product.repository';
import { UpdateProductCommand } from './update-product.command';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, void> {
  constructor(
    private readonly products: ProductRepository,
    private readonly em: EntityManager,
  ) {}

  async execute(cmd: UpdateProductCommand): Promise<void> {
    await this.em.transactional(async () => {
      const id = ProductId(cmd.productId);
      const product = await this.products.findById(id);
      if (!product) throw new ProductNotFound(cmd.productId);

      if (cmd.name !== undefined) product.rename(cmd.name);
      if (cmd.priceCents !== undefined) product.changePrice(cmd.priceCents);

      if (product.hasPendingEvents()) {
        await this.products.save(product.toValidated());
      }
    });
  }
}
