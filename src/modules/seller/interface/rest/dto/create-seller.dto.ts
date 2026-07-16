import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSellerDto {
  @ApiProperty({ maxLength: 120, example: 'Acme Inc.', type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ format: 'email', example: 'acme@example.com', type: String })
  @IsEmail()
  email!: string;
}
