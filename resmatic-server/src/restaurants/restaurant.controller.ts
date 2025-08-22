import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
// Note: avoid importing Prisma types here to keep controller decoupled from generated client
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantRoles } from './decorators/restaurant-roles.decorator';
import { RestaurantAccessGuard } from './guards/restaurant-access.guard';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RestaurantDto } from './dto/restaurant.dto';
import { RestaurantMemberDto } from './dto/restaurant-member.dto';
import { StaffInviteDto } from './dto/staff-invite.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';

@ApiTags('restaurants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'restaurants', version: '1' })
export class RestaurantController {
  constructor(private readonly service: RestaurantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new restaurant (OWNER becomes member automatically)' })
  @ApiOkResponse({ description: 'Restaurant created', type: RestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async create(@Req() req: any, @Body() dto: CreateRestaurantDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my restaurants (ACTIVE only; owned or where I am a member)' })
  @ApiOkResponse({ description: 'Array of restaurants', type: RestaurantDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async mine(@Req() req: any) {
    return this.service.findAllForUser(req.user.id, req.user?.role);
  }

  @Get('archived')
  @ApiOperation({ summary: 'List my archived restaurants' })
  @ApiOkResponse({ description: 'Array of archived restaurants', type: RestaurantDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async archived(@Req() req: any) {
    return this.service.findArchivedForUser(req.user.id, req.user?.role);
  }

  @UseGuards(RestaurantAccessGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get one restaurant by id if you have access' })
  @ApiOkResponse({ description: 'Restaurant detail', type: RestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiNotFoundResponse({ description: 'Restaurant not found or no access' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  async getOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOneForUser(req.user.id, id, req.user?.role);
  }

  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Update restaurant (name/status) - OWNER or MANAGER' })
  @ApiOkResponse({ description: 'Restaurant updated', type: RestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Requires OWNER or MANAGER' })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  async update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    const payload: any = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.status !== undefined) payload.status = dto.status; // maps to enum via service/Prisma
    return this.service.update(id, payload as any);
  }

  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER')
  @Delete(':id')
  @ApiOperation({ summary: 'Archive restaurant - OWNER only' })
  @ApiOkResponse({ description: 'Restaurant archived', type: RestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Requires OWNER' })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  async archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @Get(':id/members')
  @ApiOperation({ summary: 'List members - OWNER or MANAGER' })
  @ApiOkResponse({ description: 'Array of members', type: RestaurantMemberDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Requires OWNER or MANAGER' })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  async members(@Param('id') id: string) {
    return this.service.listMembers(id);
  }

  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @Post(':id/invites')
  @ApiOperation({ summary: 'Invite a staff member - OWNER or MANAGER' })
  @ApiOkResponse({ description: 'Invite created', type: StaffInviteDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Requires OWNER or MANAGER' })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  async invite(@Param('id') id: string, @Body() dto: InviteStaffDto) {
    return this.service.createInvite(id, dto);
  }

  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER')
  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role (WAITER|MANAGER) - OWNER only' })
  @ApiOkResponse({ description: 'Member updated', type: RestaurantMemberDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Requires OWNER' })
  @ApiNotFoundResponse({ description: 'Restaurant or member not found' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'userId', example: 'ckv9h1user0000xyz123' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.service.updateMemberRole(id, userId, dto.tenantRole);
  }

  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member - OWNER or MANAGER' })
  @ApiOkResponse({ description: 'Member removed', type: OkResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Requires OWNER or MANAGER' })
  @ApiNotFoundResponse({ description: 'Restaurant or member not found' })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'userId', example: 'ckv9h1user0000xyz123' })
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeMember(id, userId);
  }
}
