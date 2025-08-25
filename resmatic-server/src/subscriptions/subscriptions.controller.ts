import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantAccessGuard } from '../restaurants/guards/restaurant-access.guard';
import { RestaurantRoles } from '../restaurants/decorators/restaurant-roles.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionDto } from './dto/subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ChangeSubscriptionStatusDto } from './dto/change-subscription-status.dto';
import { UsageCounterDto } from './dto/usage-counter.dto';
import { UsageIncrementDto } from './dto/usage-increment.dto';

@ApiTags('subscriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'restaurants/:id/subscription', version: '1' })
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'Get active subscription for a restaurant' })
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  getActive(@Param('id') id: string) {
    return this.service.getActiveForRestaurant(id);
  }

  @Post()
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create subscription - OWNER/MANAGER' })
  @ApiCreatedResponse({ type: SubscriptionDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  create(@Param('id') id: string, @Body() dto: CreateSubscriptionDto) {
    return this.service.create(id, dto.planId);
  }

  @Patch('status')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Change subscription status - OWNER/MANAGER' })
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeSubscriptionStatusDto) {
    return this.service.changeStatus(id, dto.status);
  }

  @Get('usage')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List usage counters for active subscription' })
  @ApiOkResponse({ type: UsageCounterDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  listUsage(@Param('id') id: string) {
    return this.service.listUsage(id);
  }

  @Post('usage/increment')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Increment a usage counter for active subscription - OWNER/MANAGER' })
  @ApiCreatedResponse({ type: UsageCounterDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  incrementUsage(@Param('id') id: string, @Body() dto: UsageIncrementDto) {
    return this.service.incrementUsage(id, dto.metric, dto.amount ?? 1);
  }
}
