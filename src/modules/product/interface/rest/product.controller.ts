import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, toProductResponse } from './dto/product.response';
import { CreateProductCommand } from '../../application/commands/create-product.command';
import { UpdateProductCommand } from '../../application/commands/update-product.command';
import { GetProductQuery } from '../../application/queries/get-product.query';
import { ListProductsQuery } from '../../application/queries/list-products.query';
import { Product } from '../../domain/product';
import { ProductId } from '../../domain/product-id';

@Controller('products')
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
    const id = await this.commandBus.execute<CreateProductCommand, ProductId>(
      new CreateProductCommand(dto.sellerId, dto.name, dto.priceCents),
    );
    const product = await this.queryBus.execute<GetProductQuery, Product>(new GetProductQuery(id));
    return toProductResponse(product);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponse> {
    const product = await this.queryBus.execute<GetProductQuery, Product>(new GetProductQuery(id));
    return toProductResponse(product);
  }

  @Get()
  async list(
    @Query('sellerId') sellerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ProductResponse[]> {
    const products = await this.queryBus.execute<ListProductsQuery, Product[]>(
      new ListProductsQuery(
        sellerId,
        limit ? Number(limit) : undefined,
        offset ? Number(offset) : undefined,
      ),
    );
    return products.map(toProductResponse);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    await this.commandBus.execute<UpdateProductCommand, void>(
      new UpdateProductCommand(id, dto.name, dto.priceCents),
    );
    const product = await this.queryBus.execute<GetProductQuery, Product>(new GetProductQuery(id));
    return toProductResponse(product);
  }
}
