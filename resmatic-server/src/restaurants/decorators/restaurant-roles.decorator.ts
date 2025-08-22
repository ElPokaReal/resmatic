import { SetMetadata } from '@nestjs/common';

export const RESTAURANT_ROLES_KEY = 'restaurant_roles';
export type TenantRoleStr = 'OWNER' | 'MANAGER' | 'WAITER';
export const RestaurantRoles = (...roles: TenantRoleStr[]) =>
  SetMetadata(RESTAURANT_ROLES_KEY, roles);
