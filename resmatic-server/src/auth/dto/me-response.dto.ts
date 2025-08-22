import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class MeResponseDto {
  @ApiProperty({ type: () => UserDto })
  user!: UserDto;
}
