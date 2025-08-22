import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RestaurantAccessGuard } from '../restaurants/guards/restaurant-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, RestaurantAccessGuard],
})
export class OrdersModule {}
