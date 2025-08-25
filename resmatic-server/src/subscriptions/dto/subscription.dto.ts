import { ApiProperty } from '@nestjs/swagger';
import { PlanDto } from './plan.dto';

export class SubscriptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty({ enum: ['ACTIVE', 'CANCELED'] })
  status!: 'ACTIVE' | 'CANCELED';

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty({ required: false })
  endsAt?: Date | null;

  @ApiProperty({ required: false })
  canceledAt?: Date | null;

  @ApiProperty({ required: false })
  trialEndsAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: PlanDto, required: false })
  plan?: PlanDto;
}
