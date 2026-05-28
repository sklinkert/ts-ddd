import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SellerOrmEntity } from './infrastructure/persistence/seller.orm-entity';
import { MikroOrmSellerRepository } from './infrastructure/persistence/mikro-orm-seller.repository';
import { SellerRepository } from './domain/seller.repository';
import { SellerController } from './interface/rest/seller.controller';
import { CreateSellerHandler } from './application/commands/create-seller.handler';
import { RenameSellerHandler } from './application/commands/rename-seller.handler';
import { GetSellerHandler } from './application/queries/get-seller.handler';
import { ListSellersHandler } from './application/queries/list-sellers.handler';

const handlers = [CreateSellerHandler, RenameSellerHandler, GetSellerHandler, ListSellersHandler];

@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([SellerOrmEntity])],
  controllers: [SellerController],
  providers: [{ provide: SellerRepository, useClass: MikroOrmSellerRepository }, ...handlers],
  exports: [SellerRepository],
})
export class SellerModule {}
