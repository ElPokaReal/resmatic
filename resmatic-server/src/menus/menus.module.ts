import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { RestaurantAccessGuard } from '../restaurants/guards/restaurant-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [MenusController],
  providers: [MenusService, RestaurantAccessGuard],
})
export class MenusModule {}
