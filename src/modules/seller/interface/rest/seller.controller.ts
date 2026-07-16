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
import { CreateSellerDto } from './dto/create-seller.dto';
import { RenameSellerDto } from './dto/rename-seller.dto';
import { SellerResponse, toSellerResponse } from './dto/seller.response';
import { ListPaginationDto } from '../../../../shared/interface/dto/list-pagination.dto';
import { CreateSellerCommand } from '../../application/commands/create-seller.command';
import { RenameSellerCommand } from '../../application/commands/rename-seller.command';
import { GetSellerQuery } from '../../application/queries/get-seller.query';
import { ListSellersQuery } from '../../application/queries/list-sellers.query';
import { SellerId } from '../../domain/seller-id';
import { Seller } from '../../domain/seller';

@ApiTags('sellers')
@Controller('sellers')
export class SellerController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a seller' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Replays the cached response when the same key + body is retried',
  })
  @ApiResponse({ status: 201, type: SellerResponse })
  @ApiResponse({ status: 400, description: 'Validation or invariant violation' })
  @ApiResponse({ status: 409, description: 'Idempotency-Key reused with a different body' })
  async create(@Body() dto: CreateSellerDto): Promise<SellerResponse> {
    const id = await this.commandBus.execute<CreateSellerCommand, SellerId>(
      new CreateSellerCommand(dto.name, dto.email),
    );
    const seller = await this.queryBus.execute<GetSellerQuery, Seller>(new GetSellerQuery(id));
    return toSellerResponse(seller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a seller by id' })
  @ApiResponse({ status: 200, type: SellerResponse })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<SellerResponse> {
    const seller = await this.queryBus.execute<GetSellerQuery, Seller>(new GetSellerQuery(id));
    return toSellerResponse(seller);
  }

  @Get()
  @ApiOperation({ summary: 'List sellers' })
  @ApiResponse({ status: 200, type: [SellerResponse] })
  async list(@Query() query: ListPaginationDto): Promise<SellerResponse[]> {
    const sellers = await this.queryBus.execute<ListSellersQuery, Seller[]>(
      new ListSellersQuery(query.limit, query.offset),
    );
    return sellers.map(toSellerResponse);
  }

  @Patch(':id/name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a seller' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Replays the cached response when the same key + body is retried',
  })
  @ApiResponse({ status: 200, type: SellerResponse })
  @ApiResponse({ status: 400, description: 'Validation or invariant violation' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 409, description: 'Idempotency-Key reused with a different body' })
  async rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameSellerDto,
  ): Promise<SellerResponse> {
    await this.commandBus.execute<RenameSellerCommand, void>(new RenameSellerCommand(id, dto.name));
    const seller = await this.queryBus.execute<GetSellerQuery, Seller>(new GetSellerQuery(id));
    return toSellerResponse(seller);
  }
}
