import type { Role } from '../../users/user.entity';

// Centralized RBAC helpers to keep ADMIN bypass consistent across modules
export function isAdmin(user: { role?: Role } | undefined): boolean {
  return user?.role === 'ADMIN';
}

export type UserLike = { id?: string; email?: string; role?: Role };
