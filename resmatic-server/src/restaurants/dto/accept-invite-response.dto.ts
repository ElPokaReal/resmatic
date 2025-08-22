import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteResponseDto {
  @ApiProperty({ example: 'ckv9h1rest0000xyz123' })
  restaurantId!: string;
}
