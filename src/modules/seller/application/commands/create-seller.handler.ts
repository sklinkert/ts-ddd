import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Seller } from '../../domain/seller';
import { SellerId } from '../../domain/seller-id';
import { SellerRepository } from '../../domain/seller.repository';
import { CreateSellerCommand } from './create-seller.command';

@CommandHandler(CreateSellerCommand)
export class CreateSellerHandler implements ICommandHandler<CreateSellerCommand, SellerId> {
  constructor(
    private readonly sellers: SellerRepository,
    private readonly em: EntityManager,
  ) {}

  async execute(cmd: CreateSellerCommand): Promise<SellerId> {
    return this.em.transactional(async () => {
      const seller = Seller.create({ name: cmd.name, email: cmd.email });
      const saved = await this.sellers.save(seller.toValidated());
      return saved.id;
    });
  }
}
