import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RestaurantParam = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const key = data || 'id';
    return req.params?.[key] || req.params?.restaurantId || undefined;
  },
);
