import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EntityManager } from '@mikro-orm/postgresql';
import { SellerId } from '../../domain/seller-id';
import { SellerNotFound } from '../../domain/errors';
import { SellerRepository } from '../../domain/seller.repository';
import { RenameSellerCommand } from './rename-seller.command';

@CommandHandler(RenameSellerCommand)
export class RenameSellerHandler implements ICommandHandler<RenameSellerCommand, void> {
  constructor(
    private readonly sellers: SellerRepository,
    private readonly em: EntityManager,
  ) {}

  async execute(cmd: RenameSellerCommand): Promise<void> {
    await this.em.transactional(async () => {
      const id = SellerId(cmd.sellerId);
      const seller = await this.sellers.findById(id);
      if (!seller) throw new SellerNotFound(cmd.sellerId);
      seller.rename(cmd.name);
      await this.sellers.save(seller.toValidated());
    });
  }
}
