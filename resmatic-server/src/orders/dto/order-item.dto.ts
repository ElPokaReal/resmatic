import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  orderId!: string;
  @ApiProperty()
  menuItemId!: string;
  @ApiProperty()
  nameSnapshot!: string;
  @ApiProperty({ example: 9.99 })
  unitPrice!: any; // Decimal serialized
  @ApiProperty({ example: 1 })
  quantity!: number;
  @ApiProperty({ required: false })
  note?: string | null;
  @ApiProperty()
  sortOrder!: number;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
