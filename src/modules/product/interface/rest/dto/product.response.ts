import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../../domain/product';

export class ProductResponse {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ format: 'uuid', type: String })
  sellerId!: string;

  @ApiProperty({ example: 'Widget', type: String })
  name!: string;

  @ApiProperty({ example: 1299, description: 'Price in minor units (cents)', type: Number })
  priceCents!: number;

  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code', type: String })
  currency!: string;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string;
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    sellerId: product.sellerId,
    name: product.name,
    priceCents: product.priceCents,
    currency: product.currency,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
