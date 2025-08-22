import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

export class InviteStaffDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['WAITER', 'MANAGER'] })
  @IsIn(['WAITER', 'MANAGER'])
  tenantRole!: 'WAITER' | 'MANAGER';
}
