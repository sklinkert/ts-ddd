import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameSellerDto {
  @ApiProperty({ maxLength: 120, example: 'Acme Corp.', type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
