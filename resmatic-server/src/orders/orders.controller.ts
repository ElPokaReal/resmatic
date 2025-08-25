import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
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
import { Prisma } from '@prisma/client';

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
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  list(@Param('id') id: string) {
    return this.service.list(id);
  }

  @Post()
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Create order - OWNER/MANAGER/WAITER' })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiBody({
    type: CreateOrderDto,
    examples: {
      simple: {
        summary: 'Orden simple',
        value: { tableNumber: 5, customerName: 'Alice', notes: 'Sin cebolla' },
      },
      minimal: {
        summary: 'Sólo mesa',
        value: { tableNumber: 12 },
      },
    },
  })
  create(@Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.service.create(id, dto);
  }

  @Get(':orderId')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'Get one order' })
  @ApiOkResponse({ type: OrderDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
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
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  @ApiBody({
    type: UpdateOrderDto,
    examples: {
      notes: { summary: 'Actualizar notas', value: { notes: 'Preparar sin sal' } },
      tableAndCustomer: { summary: 'Actualizar mesa y cliente', value: { tableNumber: 3, customerName: 'Carlos' } },
    },
  })
  update(@Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: UpdateOrderDto) {
    const data: Prisma.OrderUpdateInput = {};
    if (dto.tableNumber !== undefined) data.tableNumber = dto.tableNumber;
    if (dto.customerName !== undefined) data.customerName = dto.customerName;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.service.update(id, orderId, data);
  }

  @Post(':orderId/status')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Change order status - OWNER/MANAGER/WAITER' })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  @ApiBody({
    type: ChangeStatusDto,
    examples: {
      confirm: { summary: 'Confirmar', value: { status: 'CONFIRMED', message: 'Cliente confirmó' } },
      progress: { summary: 'En progreso', value: { status: 'IN_PROGRESS' } },
      ready: { summary: 'Listo', value: { status: 'READY', message: 'Listo para servir' } },
      complete: { summary: 'Completado', value: { status: 'COMPLETED' } },
      cancel: { summary: 'Cancelado', value: { status: 'CANCELED', message: 'Cliente se retiró' } },
    },
  })
  changeStatus(@Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: ChangeStatusDto) {
    return this.service.changeStatus(id, orderId, dto.status as any, dto.message);
  }

  @Get(':orderId/events')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List order events' })
  @ApiOkResponse({ type: OrderEventDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  listEvents(@Param('id') id: string, @Param('orderId') orderId: string) {
    return this.service.listEvents(id, orderId);
  }

  @Post(':orderId/items')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Add item to order - OWNER/MANAGER/WAITER' })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  @ApiBody({
    type: CreateOrderItemDto,
    examples: {
      simple: {
        summary: 'Agregar ítem básico',
        value: { menuItemId: 'ckv9h1item0000xyz123', quantity: 2, note: 'Poco hecho' },
      },
    },
  })
  addItem(@Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: CreateOrderItemDto) {
    return this.service.addItem(id, orderId, dto);
  }

  @Patch(':orderId/items/:orderItemId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Update order item - OWNER/MANAGER/WAITER' })
  @ApiOkResponse({ type: OrderDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'orderId', example: 'ckv9h1orde0000xyz123' })
  @ApiParam({ name: 'orderItemId', example: 'ckv9h1orit0000xyz123' })
  @ApiBody({
    type: UpdateOrderItemDto,
    examples: {
      qty: { summary: 'Cambiar cantidad', value: { quantity: 3 } },
      note: { summary: 'Actualizar nota', value: { note: 'Sin gluten' } },
      reorder: { summary: 'Reordenar', value: { sortOrder: 1 } },
    },
  })
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
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
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
