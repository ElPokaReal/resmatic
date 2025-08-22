import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: 'ckv9h1abc0000xyz123' })
  id!: string;

  @ApiProperty({ example: 'admin@resmatic.local' })
  email!: string;

  @ApiProperty({ example: 'Admin' })
  name!: string;

  @ApiProperty({ example: 'ADMIN', enum: ['ADMIN', 'USER'] })
  role!: 'ADMIN' | 'USER';
}
