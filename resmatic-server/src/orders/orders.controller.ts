import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantAccessGuard } from '../restaurants/guards/restaurant-access.guard';
import { RestaurantRoles } from '../restaurants/decorators/restaurant-roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderDto } from './dto/order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderItemDto } from './dto/order-item.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { OrderEventDto } from './dto/order-event.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'restaurants/:id/orders', version: '1' })
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List orders for a restaurant' })
  @ApiOkResponse({ type: OrderDto, isArray: true })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  list(@Param('id') id: string) {
    return this.service.list(id);
  }

  @Post()
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Create order - OWNER/MANAGER/WAITER' })
  @ApiOkResponse({ type: OrderDto })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  create(@Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.service.create(id, dto);
  }

  @Get(':orderId')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'Get one order' })
  @ApiOkResponse({ type: OrderDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  getOne(@Param('id') id: string, @Param('orderId') orderId: string) {
    return this.service.getOne(id, orderId);
  }

  @Patch(':orderId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update order - OWNER/MANAGER' })
  @ApiOkResponse({ type: OrderDto })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  update(@Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, orderId, dto as any);
  }

  @Post(':orderId/status')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Change order status - OWNER/MANAGER/WAITER' })
  @ApiOkResponse({ type: OrderDto })
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  changeStatus(@Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: ChangeStatusDto) {
    return this.service.changeStatus(id, orderId, dto.status as any, dto.message);
  }

  @Get(':orderId/events')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List order events' })
  @ApiOkResponse({ type: OrderEventDto, isArray: true })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  listEvents(@Param('id') id: string, @Param('orderId') orderId: string) {
    return this.service.listEvents(id, orderId);
  }

  @Post(':orderId/items')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Add item to order - OWNER/MANAGER/WAITER' })
  @ApiOkResponse({ type: OrderDto })
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  addItem(@Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: CreateOrderItemDto) {
    return this.service.addItem(id, orderId, dto);
  }

  @Patch(':orderId/items/:orderItemId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Update order item - OWNER/MANAGER/WAITER' })
  @ApiOkResponse({ type: OrderDto })
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  @ApiParam({ name: 'orderItemId', example: 'ckv9h1orit0000xyz123' })
  updateItem(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.service.updateItem(id, orderId, orderItemId, dto);
  }

  @Delete(':orderId/items/:orderItemId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Delete order item - OWNER/MANAGER/WAITER' })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  @ApiParam({ name: 'orderItemId', example: 'ckv9h1orit0000xyz123' })
  deleteItem(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Param('orderItemId') orderItemId: string,
  ) {
    return this.service.deleteItem(id, orderId, orderItemId);
  }
}
