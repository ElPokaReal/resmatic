import { ApiProperty } from '@nestjs/swagger';

export class UsageCounterDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty()
  value!: number;

  @ApiProperty()
  updatedAt!: Date;
}
