import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PlansController } from './plans.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { RestaurantAccessGuard } from '../restaurants/guards/restaurant-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionsService, RestaurantAccessGuard],
})
export class SubscriptionsModule {}
