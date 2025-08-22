import { ApiProperty } from '@nestjs/swagger';

export class MenuDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  restaurantId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ required: false })
  description?: string | null;
  @ApiProperty()
  sortOrder!: number;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
