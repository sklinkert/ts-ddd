import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListPaginationDto } from '../../../../../shared/interface/dto/list-pagination.dto';

export class ListProductsDto extends ListPaginationDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by owning seller', type: String })
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}
