import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../auth/dto/user.dto';

export class RestaurantMemberDto {
  @ApiProperty({ example: 'ckv9h1mem0000xyz123' })
  id!: string;

  @ApiProperty({ example: 'ckv9h1rest0000xyz123' })
  restaurantId!: string;

  @ApiProperty({ example: 'ckv9h1user0000xyz123' })
  userId!: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'WAITER'], example: 'WAITER' })
  tenantRole!: 'OWNER' | 'MANAGER' | 'WAITER';

  @ApiProperty({ example: '2025-01-15T10:20:30.000Z' })
  createdAt!: string | Date;

  @ApiProperty({ type: () => UserDto, required: false, nullable: true })
  user?: UserDto | null;
}
