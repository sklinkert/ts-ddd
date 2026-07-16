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
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductResponse, toProductResponse } from './dto/product.response';
import { CreateProductCommand } from '../../application/commands/create-product.command';
import { UpdateProductCommand } from '../../application/commands/update-product.command';
import { GetProductQuery } from '../../application/queries/get-product.query';
import { ListProductsQuery } from '../../application/queries/list-products.query';
import { Product } from '../../domain/product';
import { ProductId } from '../../domain/product-id';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Replays the cached response when the same key + body is retried',
  })
  @ApiResponse({ status: 201, type: ProductResponse })
  @ApiResponse({ status: 400, description: 'Validation or invariant violation' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 409, description: 'Idempotency-Key reused with a different body' })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
    const id = await this.commandBus.execute<CreateProductCommand, ProductId>(
      new CreateProductCommand(dto.sellerId, dto.name, dto.priceCents, dto.currency),
    );
    const product = await this.queryBus.execute<GetProductQuery, Product>(new GetProductQuery(id));
    return toProductResponse(product);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiResponse({ status: 200, type: ProductResponse })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponse> {
    const product = await this.queryBus.execute<GetProductQuery, Product>(new GetProductQuery(id));
    return toProductResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiResponse({ status: 200, type: [ProductResponse] })
  async list(@Query() query: ListProductsDto): Promise<ProductResponse[]> {
    const products = await this.queryBus.execute<ListProductsQuery, Product[]>(
      new ListProductsQuery(query.sellerId, query.limit, query.offset),
    );
    return products.map(toProductResponse);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a product (rename and/or change price)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Replays the cached response when the same key + body is retried',
  })
  @ApiResponse({ status: 200, type: ProductResponse })
  @ApiResponse({ status: 400, description: 'Validation or invariant violation' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Idempotency-Key reused with a different body' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    await this.commandBus.execute<UpdateProductCommand, void>(
      new UpdateProductCommand(id, dto.name, dto.priceCents, dto.currency),
    );
    const product = await this.queryBus.execute<GetProductQuery, Product>(new GetProductQuery(id));
    return toProductResponse(product);
  }
}
