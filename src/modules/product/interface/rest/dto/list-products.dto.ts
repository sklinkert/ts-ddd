import { IsOptional, IsUUID } from 'class-validator';
import { ListPaginationDto } from '../../../../../shared/interface/dto/list-pagination.dto';

export class ListProductsDto extends ListPaginationDto {
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}
