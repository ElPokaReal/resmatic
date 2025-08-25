import { ApiProperty } from '@nestjs/swagger';

export class PlanDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'ENTRANTE' })
  code!: string;

  @ApiProperty({ example: 'Entrante' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ example: '19.00', description: 'Decimal serialized as string' })
  monthlyPrice!: string;

  @ApiProperty({ type: String, isArray: true })
  features!: string[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
