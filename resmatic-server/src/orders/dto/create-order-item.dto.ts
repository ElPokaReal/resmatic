import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsNotEmpty, MaxLength, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'ckv9h1item0000xyz123' })
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Sin sal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
