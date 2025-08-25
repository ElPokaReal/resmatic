import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlansService } from './plans.service';
import { PlanDto } from './dto/plan.dto';

@ApiTags('plans')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List available plans' })
  @ApiOkResponse({ type: PlanDto, isArray: true })
  @ApiUnauthorizedResponse()
  list() {
    return this.service.list();
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get plan by id' })
  @ApiOkResponse({ type: PlanDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'planId', example: 'ckv9h1plan0000xyz123' })
  getOne(@Param('planId') planId: string) {
    return this.service.getOne(planId);
  }
}
