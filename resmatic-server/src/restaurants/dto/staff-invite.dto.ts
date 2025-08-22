import { ApiProperty } from '@nestjs/swagger';

export class StaffInviteDto {
  @ApiProperty({ example: 'ckv9h1inv0000xyz123' })
  id!: string;

  @ApiProperty({ example: 'ckv9h1rest0000xyz123' })
  restaurantId!: string;

  @ApiProperty({ example: 'waiter@example.com' })
  email!: string;

  @ApiProperty({ enum: ['WAITER', 'MANAGER'], example: 'WAITER' })
  tenantRole!: 'WAITER' | 'MANAGER';

  @ApiProperty({ example: '99e7af5b-8a15-4b1b-9b6e-1a3a1b2c3d4e' })
  token!: string;

  @ApiProperty({ example: '2025-01-22T10:20:30.000Z' })
  expiresAt!: string | Date;

  @ApiProperty({ example: '2025-01-16T10:20:30.000Z', required: false, nullable: true })
  acceptedAt?: string | Date | null;

  @ApiProperty({ example: '2025-01-15T10:20:30.000Z' })
  createdAt!: string | Date;
}
