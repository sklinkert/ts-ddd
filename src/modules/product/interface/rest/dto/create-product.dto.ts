import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsISO4217CurrencyCode,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ format: 'uuid', description: 'Id of the owning seller', type: String })
  @IsUUID()
  sellerId!: string;

  @ApiProperty({ maxLength: 120, example: 'Widget', type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    minimum: 1,
    example: 1299,
    description: 'Price in minor units (cents)',
    type: Number,
  })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  priceCents!: number;

  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code', type: String })
  @IsISO4217CurrencyCode()
  currency!: string;
}
