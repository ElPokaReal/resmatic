import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// NOTE: We import PrismaService from its module export path to reuse the provided instance
// The service is global via PrismaModule

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const plans = await (this.prisma as any).plan.findMany({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } });
    return plans.map((p: any) => this.serializePlan(p));
  }

  async getOne(planId: string) {
    const plan = await (this.prisma as any).plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.serializePlan(plan);
  }

  private serializePlan(p: any) {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      monthlyPrice: String(p.monthlyPrice),
      features: p.features ?? [],
      isActive: !!p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
