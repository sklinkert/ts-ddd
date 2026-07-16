import { ApiProperty } from '@nestjs/swagger';
import { Seller } from '../../../domain/seller';

export class SellerResponse {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ example: 'Acme Inc.', type: String })
  name!: string;

  @ApiProperty({ format: 'email', type: String })
  email!: string;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string;
}

export function toSellerResponse(seller: Seller): SellerResponse {
  return {
    id: seller.id,
    name: seller.name,
    email: seller.email,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
  };
}
