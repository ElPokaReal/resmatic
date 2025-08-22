import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatusDto } from './order-status.dto';

export class ChangeStatusDto {
  @ApiProperty({ enum: OrderStatusDto, example: OrderStatusDto.CONFIRMED })
  @IsEnum(OrderStatusDto)
  status!: OrderStatusDto;

  @ApiPropertyOptional({ example: 'Cliente confirmó el pedido' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
