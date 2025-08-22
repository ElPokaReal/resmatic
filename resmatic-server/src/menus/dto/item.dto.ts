import { ApiProperty } from '@nestjs/swagger';

export class ItemDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  sectionId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ required: false })
  description?: string | null;
  @ApiProperty({ example: 9.99 })
  price!: any; // Decimal serialized
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status!: 'ACTIVE' | 'INACTIVE';
  @ApiProperty({ type: [String] })
  tags!: string[];
  @ApiProperty()
  sortOrder!: number;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
