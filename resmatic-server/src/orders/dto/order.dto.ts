import { ApiProperty } from '@nestjs/swagger';
import { OrderStatusDto } from './order-status.dto';

export class OrderDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  restaurantId!: string;
  @ApiProperty({ enum: OrderStatusDto })
  status!: OrderStatusDto;
  @ApiProperty({ required: false })
  tableNumber?: number | null;
  @ApiProperty({ required: false })
  customerName?: string | null;
  @ApiProperty({ required: false })
  notes?: string | null;
  @ApiProperty({ example: '0.00' })
  total!: string; // Decimal serialized as string
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
