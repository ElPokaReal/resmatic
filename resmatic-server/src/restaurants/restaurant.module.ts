import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { InvitesController } from './invites.controller';
import { RestaurantAccessGuard } from './guards/restaurant-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantController, InvitesController],
  providers: [RestaurantService, RestaurantAccessGuard],
  exports: [RestaurantService],
})
export class RestaurantsModule {}
