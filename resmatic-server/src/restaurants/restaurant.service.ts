import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantRole, RestaurantStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import type { Role } from '../users/user.entity';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, data: { name: string }) {
    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: data.name,
          ownerId,
        },
      });
      await tx.restaurantMember.create({
        data: {
          restaurantId: restaurant.id,
          userId: ownerId,
          tenantRole: TenantRole.OWNER,
        },
      });
      return restaurant;
    });
  }

  async findAllForUser(userId: string, role?: Role) {
    // ADMIN sees all ACTIVE restaurants
    if (role === 'ADMIN') {
      return this.prisma.restaurant.findMany({
        where: { status: RestaurantStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
    }
    // Others: only ACTIVE where owner or member
    return this.prisma.restaurant.findMany({
      where: {
        AND: [
          {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
          { status: RestaurantStatus.ACTIVE },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findArchivedForUser(userId: string, role?: Role) {
    // ADMIN sees all ARCHIVED restaurants
    if (role === 'ADMIN') {
      return this.prisma.restaurant.findMany({
        where: { status: RestaurantStatus.ARCHIVED },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.restaurant.findMany({
      where: {
        AND: [
          {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
          { status: RestaurantStatus.ARCHIVED },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(userId: string, restaurantId: string, role?: Role) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    // ADMIN can access regardless of membership
    if (role === 'ADMIN') return restaurant;

    if (restaurant.ownerId === userId) return restaurant;

    const membership = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    });
    if (!membership) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async update(restaurantId: string, data: Prisma.RestaurantUpdateInput) {
    return this.prisma.restaurant.update({ where: { id: restaurantId }, data });
  }

  async archive(restaurantId: string) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { status: RestaurantStatus.ARCHIVED },
    });
  }

  async listMembers(restaurantId: string) {
    return this.prisma.restaurantMember.findMany({
      where: { restaurantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createInvite(restaurantId: string, data: { email: string; tenantRole: 'WAITER' | 'MANAGER' }) {
    const token = randomUUID();
    return this.prisma.staffInvite.create({
      data: {
        restaurantId,
        email: data.email,
        tenantRole: data.tenantRole as TenantRole,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      },
    });
  }

  async acceptInvite(params: { userId: string; token: string; userEmail?: string }) {
    const now = new Date();
    // ensure we have user's email
    let email = params.userEmail;
    if (!email) {
      const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
      if (!user) throw new NotFoundException('User not found');
      email = user.email as string;
    }
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.staffInvite.findUnique({ where: { token: params.token } });
      if (!invite) throw new NotFoundException('Invite not found');
      if (invite.acceptedAt) throw new NotFoundException('Invite already accepted');
      if (invite.expiresAt <= now) throw new NotFoundException('Invite expired');
      if (invite.email.toLowerCase() !== (email as string).toLowerCase()) {
        throw new NotFoundException('Invite does not match your account');
      }

      const restaurant = await tx.restaurant.findUnique({ where: { id: invite.restaurantId } });
      if (!restaurant) throw new NotFoundException('Restaurant not found');

      // Prevent duplicate membership
      const existing = await tx.restaurantMember.findUnique({
        where: { restaurantId_userId: { restaurantId: invite.restaurantId, userId: params.userId } },
      });
      if (!existing) {
        await tx.restaurantMember.create({
          data: {
            restaurantId: invite.restaurantId,
            userId: params.userId,
            tenantRole: invite.tenantRole,
          },
        });
      }

      await tx.staffInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: now },
      });

      return { restaurantId: invite.restaurantId };
    });
  }

  async removeMember(restaurantId: string, userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.ownerId === userId) {
      throw new NotFoundException('Owner cannot be removed');
    }
    // Ensure membership exists
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    });
    if (!membership) throw new NotFoundException('Member not found');
    await this.prisma.restaurantMember.delete({
      where: { restaurantId_userId: { restaurantId, userId } },
    });
    return { ok: true };
  }

  async updateMemberRole(restaurantId: string, userId: string, role: 'MANAGER' | 'WAITER') {
    // Prevent changing owner via this endpoint
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.ownerId === userId) {
      throw new NotFoundException('Cannot change owner role');
    }
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    });
    if (!membership) throw new NotFoundException('Member not found');
    return this.prisma.restaurantMember.update({
      where: { restaurantId_userId: { restaurantId, userId } },
      data: { tenantRole: role as TenantRole },
    });
  }
}
