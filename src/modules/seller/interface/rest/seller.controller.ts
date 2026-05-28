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
import { CreateSellerDto } from './dto/create-seller.dto';
import { RenameSellerDto } from './dto/rename-seller.dto';
import { SellerResponse, toSellerResponse } from './dto/seller.response';
import { CreateSellerCommand } from '../../application/commands/create-seller.command';
import { RenameSellerCommand } from '../../application/commands/rename-seller.command';
import { GetSellerQuery } from '../../application/queries/get-seller.query';
import { ListSellersQuery } from '../../application/queries/list-sellers.query';
import { SellerId } from '../../domain/seller-id';
import { Seller } from '../../domain/seller';

@Controller('sellers')
export class SellerController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSellerDto): Promise<SellerResponse> {
    const id = await this.commandBus.execute<CreateSellerCommand, SellerId>(
      new CreateSellerCommand(dto.name, dto.email),
    );
    const seller = await this.queryBus.execute<GetSellerQuery, Seller>(new GetSellerQuery(id));
    return toSellerResponse(seller);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<SellerResponse> {
    const seller = await this.queryBus.execute<GetSellerQuery, Seller>(new GetSellerQuery(id));
    return toSellerResponse(seller);
  }

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SellerResponse[]> {
    const sellers = await this.queryBus.execute<ListSellersQuery, Seller[]>(
      new ListSellersQuery(limit ? Number(limit) : undefined, offset ? Number(offset) : undefined),
    );
    return sellers.map(toSellerResponse);
  }

  @Patch(':id/name')
  @HttpCode(HttpStatus.OK)
  async rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameSellerDto,
  ): Promise<SellerResponse> {
    await this.commandBus.execute<RenameSellerCommand, void>(new RenameSellerCommand(id, dto.name));
    const seller = await this.queryBus.execute<GetSellerQuery, Seller>(new GetSellerQuery(id));
    return toSellerResponse(seller);
  }
}
