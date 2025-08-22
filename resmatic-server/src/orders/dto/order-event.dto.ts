import { ApiProperty } from '@nestjs/swagger';
import { OrderStatusDto } from './order-status.dto';

export class OrderEventDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  orderId!: string;
  @ApiProperty({ enum: OrderStatusDto })
  status!: OrderStatusDto;
  @ApiProperty({ required: false })
  message?: string | null;
  @ApiProperty()
  createdAt!: Date;
}
