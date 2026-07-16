import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProductOrmEntity } from './infrastructure/persistence/product.orm-entity';
import { MikroOrmProductRepository } from './infrastructure/persistence/mikro-orm-product.repository';
import { ProductRepository } from './domain/product.repository';
import { ProductController } from './interface/rest/product.controller';
import { CreateProductHandler } from './application/commands/create-product.handler';
import { UpdateProductHandler } from './application/commands/update-product.handler';
import { GetProductHandler } from './application/queries/get-product.handler';
import { ListProductsHandler } from './application/queries/list-products.handler';
import { SellerModule } from '../seller/seller.module';

const handlers = [
  CreateProductHandler,
  UpdateProductHandler,
  GetProductHandler,
  ListProductsHandler,
];

@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([ProductOrmEntity]), SellerModule],
  controllers: [ProductController],
  providers: [{ provide: ProductRepository, useClass: MikroOrmProductRepository }, ...handlers],
  exports: [ProductRepository],
})
export class ProductModule {}
