import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RESTAURANT_ROLES_KEY, TenantRoleStr } from '../decorators/restaurant-roles.decorator';
import { isAdmin } from '../../common/auth/rbac.util';

const RoleRank: Record<TenantRoleStr, number> = {
  OWNER: 3,
  MANAGER: 2,
  WAITER: 1,
};

@Injectable()
export class RestaurantAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string } | undefined;
    if (!user) throw new UnauthorizedException();

    // Global ADMIN bypass: allow all restaurant-scoped routes
    if (isAdmin(req.user)) {
      return true;
    }

    const params = req.params || {};
    const restaurantId: string | undefined = params.id || params.restaurantId;
    if (!restaurantId) return true; // Non-scoped routes

    // Determine required roles for this handler
    const required =
      this.reflector.getAllAndOverride<TenantRoleStr[]>(RESTAURANT_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // Check membership
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId: user.id } },
    });

    // If owner, treat as OWNER
    let effectiveRole: TenantRoleStr | null = null;
    if (!membership) {
      const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
      if (!restaurant) return false;
      if (restaurant.ownerId === user.id) effectiveRole = 'OWNER';
    } else {
      effectiveRole = membership.tenantRole as TenantRoleStr;
    }

    if (!effectiveRole) return false;

    if (!required.length) return true; // any member/owner allowed

    const userRank = RoleRank[effectiveRole];
    const minRequired = Math.min(...required.map((r) => RoleRank[r]));
    return userRank >= minRequired;
  }
}
