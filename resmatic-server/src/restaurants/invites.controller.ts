import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantService } from './restaurant.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AcceptInviteResponseDto } from './dto/accept-invite-response.dto';

@ApiTags('invites')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'invites', version: '1' })
export class InvitesController {
  constructor(private readonly restaurants: RestaurantService) {}

  @Post('accept')
  @ApiOperation({ summary: 'Accept a staff invite using token (must match your email)' })
  @ApiOkResponse({ description: 'Invite accepted; user added as member', type: AcceptInviteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiNotFoundResponse({ description: 'Invite not found/expired or does not match account' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async accept(@Req() req: any, @Body() dto: AcceptInviteDto) {
    const userId = req.user.id as string;
    const userEmail = (req.user && (req.user.email as string)) || undefined;
    return this.restaurants.acceptInvite({ userId, userEmail, token: dto.token });
  }
}
