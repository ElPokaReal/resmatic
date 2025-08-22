import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['WAITER', 'MANAGER'] })
  @IsIn(['WAITER', 'MANAGER'])
  tenantRole!: 'WAITER' | 'MANAGER';
}
