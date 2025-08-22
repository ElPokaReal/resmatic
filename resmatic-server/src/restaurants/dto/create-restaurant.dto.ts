import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Mi Restaurante' })
  @IsString()
  @MinLength(2)
  name!: string;
}
