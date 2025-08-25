import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'ckv9h1plan0000xyz123' })
  @IsString()
  planId!: string;
}
