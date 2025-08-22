import { ApiProperty } from '@nestjs/swagger';

export class AdminCheckResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 'Admin access granted' })
  message!: string;
}
