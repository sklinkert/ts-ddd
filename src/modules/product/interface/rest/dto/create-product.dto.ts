import { IsInt, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  sellerId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  priceCents!: number;
}
