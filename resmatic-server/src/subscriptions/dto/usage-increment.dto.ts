import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UsageIncrementDto {
  @ApiProperty({ example: 'ORDERS_CREATED' })
  @IsString()
  metric!: string;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number = 1;
}
