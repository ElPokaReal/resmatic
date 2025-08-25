import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ChangeSubscriptionStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'CANCELED'] })
  @IsIn(['ACTIVE', 'CANCELED'])
  status!: 'ACTIVE' | 'CANCELED';
}
