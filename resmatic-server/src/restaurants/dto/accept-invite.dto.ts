import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Token de invitación recibido por email' })
  @IsString()
  @MinLength(10)
  token!: string;
}
