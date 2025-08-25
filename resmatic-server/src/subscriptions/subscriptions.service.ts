import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveForRestaurant(restaurantId: string) {
    const sub = await (this.prisma as any).subscription.findFirst({
      where: { restaurantId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('Active subscription not found');
    return this.serializeSubscription(sub);
  }

  async create(restaurantId: string, planId: string) {
    const plan = await (this.prisma as any).plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new BadRequestException('Invalid plan');

    const existing = await (this.prisma as any).subscription.findFirst({ where: { restaurantId, status: 'ACTIVE' } });
    if (existing) throw new BadRequestException('Restaurant already has an active subscription');

    const now = new Date();
    const trialEndsAt = plan.code === 'ENTRANTE' ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : null;

    const created = await (this.prisma as any).subscription.create({
      data: {
        restaurantId,
        planId: plan.id,
        status: 'ACTIVE',
        startsAt: now,
        trialEndsAt,
      },
      include: { plan: true },
    });
    return this.serializeSubscription(created);
  }

  async changeStatus(restaurantId: string, status: 'ACTIVE' | 'CANCELED') {
    const sub = await (this.prisma as any).subscription.findFirst({ where: { restaurantId }, orderBy: { createdAt: 'desc' } });
    if (!sub) throw new NotFoundException('Subscription not found');

    if (status === 'ACTIVE') {
      const active = await (this.prisma as any).subscription.findFirst({ where: { restaurantId, status: 'ACTIVE' } });
      if (active && active.id !== sub.id) throw new BadRequestException('Another active subscription exists');
    }

    const updated = await (this.prisma as any).subscription.update({
      where: { id: sub.id },
      data: {
        status,
        canceledAt: status === 'CANCELED' ? new Date() : null,
      },
      include: { plan: true },
    });

    return this.serializeSubscription(updated);
  }

  async listUsage(restaurantId: string) {
    const sub = await (this.prisma as any).subscription.findFirst({ where: { restaurantId, status: 'ACTIVE' } });
    if (!sub) throw new NotFoundException('Active subscription not found');

    const counters = await (this.prisma as any).usageCounter.findMany({ where: { subscriptionId: sub.id } });
    return counters.map((c: any) => this.serializeUsage(c));
  }

  async incrementUsage(restaurantId: string, metric: string, amount = 1) {
    const sub = await (this.prisma as any).subscription.findFirst({ where: { restaurantId, status: 'ACTIVE' } });
    if (!sub) throw new NotFoundException('Active subscription not found');

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const key = { subscriptionId_metric_periodStart_periodEnd: { subscriptionId: sub.id, metric, periodStart, periodEnd } };

    const updated = await (this.prisma as any).usageCounter.upsert({
      where: key,
      create: { subscriptionId: sub.id, metric, periodStart, periodEnd, value: amount },
      update: { value: { increment: amount } },
    });

    return this.serializeUsage(updated);
  }

  private serializeSubscription(s: any) {
    return {
      id: s.id,
      restaurantId: s.restaurantId,
      planId: s.planId,
      status: s.status,
      startsAt: s.startsAt,
      endsAt: s.endsAt ?? null,
      canceledAt: s.canceledAt ?? null,
      trialEndsAt: s.trialEndsAt ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      plan: s.plan
        ? {
            id: s.plan.id,
            code: s.plan.code,
            name: s.plan.name,
            description: s.plan.description ?? null,
            monthlyPrice: String(s.plan.monthlyPrice),
            features: s.plan.features ?? [],
            isActive: !!s.plan.isActive,
            createdAt: s.plan.createdAt,
            updatedAt: s.plan.updatedAt,
          }
        : undefined,
    };
  }

  private serializeUsage(c: any) {
    return {
      id: c.id,
      subscriptionId: c.subscriptionId,
      metric: c.metric,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      value: c.value,
      updatedAt: c.updatedAt,
    };
  }
}
