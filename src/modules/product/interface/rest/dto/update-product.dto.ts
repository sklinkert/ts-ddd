import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ maxLength: 120, example: 'Widget Pro', type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    minimum: 1,
    example: 1499,
    description: 'Price in minor units (cents)',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  priceCents?: number;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'ISO 4217 currency code; only allowed together with priceCents',
  })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;
}
