import { ApiProperty } from '@nestjs/swagger';

export class RestaurantDto {
  @ApiProperty({ example: 'ckv9h1rest0000xyz123' })
  id!: string;

  @ApiProperty({ example: 'ckv9h1user0000xyz123' })
  ownerId!: string;

  @ApiProperty({ example: 'Mi Restaurante' })
  name!: string;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'], example: 'ACTIVE' })
  status!: 'ACTIVE' | 'ARCHIVED';

  @ApiProperty({ example: '2025-01-15T10:20:30.000Z' })
  createdAt!: string | Date;

  @ApiProperty({ example: '2025-01-15T10:20:30.000Z' })
  updatedAt!: string | Date;
}
