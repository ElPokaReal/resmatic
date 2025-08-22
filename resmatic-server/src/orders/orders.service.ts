import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(restaurantId: string) {
    return this.prisma.order.findMany({ where: { restaurantId }, orderBy: { createdAt: 'desc' } });
  }

  async getOne(restaurantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(restaurantId: string, data: { tableNumber?: number; customerName?: string; notes?: string }) {
    return this.prisma.order.create({
      data: {
        restaurantId,
        tableNumber: data.tableNumber,
        customerName: data.customerName,
        notes: data.notes,
        total: new Prisma.Decimal(0),
      },
    });
  }

  async update(restaurantId: string, orderId: string, data: Prisma.OrderUpdateInput) {
    const existing = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!existing) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id: orderId }, data });
  }

  async changeStatus(restaurantId: string, orderId: string, status: OrderStatus, message?: string) {
    const existing = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!existing) throw new NotFoundException('Order not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({ where: { id: orderId }, data: { status } });
      await tx.orderEvent.create({ data: { orderId, status, message } });
      return o;
    });
    return updated;
  }

  async addItem(restaurantId: string, orderId: string, data: { menuItemId: string; quantity: number; note?: string }) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: data.menuItemId, section: { menu: { restaurantId } } },
    });
    if (!menuItem) throw new NotFoundException('Menu item not found for restaurant');

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.create({
        data: {
          orderId,
          menuItemId: menuItem.id,
          nameSnapshot: menuItem.name,
          unitPrice: menuItem.price,
          quantity: data.quantity,
          note: data.note,
        },
      });
      await this.recalcTotalTx(tx, orderId);
    });

    return this.getOne(restaurantId, orderId);
  }

  async updateItem(
    restaurantId: string,
    orderId: string,
    orderItemId: string,
    data: Partial<{ quantity: number; note?: string; sortOrder?: number }>,
  ) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: orderItemId, orderId, order: { restaurantId } } });
    if (!item) throw new NotFoundException('Order item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          quantity: data.quantity ?? item.quantity,
          note: data.note === undefined ? item.note : data.note,
          sortOrder: data.sortOrder ?? item.sortOrder,
        },
      });
      await this.recalcTotalTx(tx, orderId);
    });

    return this.getOne(restaurantId, orderId);
  }

  async deleteItem(restaurantId: string, orderId: string, orderItemId: string) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: orderItemId, orderId, order: { restaurantId } } });
    if (!item) throw new NotFoundException('Order item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: orderItemId } });
      await this.recalcTotalTx(tx, orderId);
    });

    return { ok: true };
  }

  private async recalcTotalTx(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    const totalNumber = items.reduce((sum, it) => {
      const price = parseFloat((it.unitPrice as unknown as Prisma.Decimal).toString());
      return sum + price * it.quantity;
    }, 0);
    await tx.order.update({ where: { id: orderId }, data: { total: new Prisma.Decimal(totalNumber.toFixed(2)) } });
  }

  async listEvents(restaurantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.orderEvent.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
  }
}
