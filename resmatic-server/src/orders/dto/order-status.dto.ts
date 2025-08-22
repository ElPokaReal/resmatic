import { ApiProperty } from '@nestjs/swagger';

export enum OrderStatusDto {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export class OrderStatusWrapperDto {
  @ApiProperty({ enum: OrderStatusDto, example: OrderStatusDto.PENDING })
  status!: OrderStatusDto;
}
