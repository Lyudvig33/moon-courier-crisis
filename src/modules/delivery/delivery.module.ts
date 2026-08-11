import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameModule } from '../game/game.module';
import { GameSession } from '../../entities/game-session.entity';
import { Order } from '../../entities/order.entity';
import { Route } from '../../entities/route.entity';
import { Rover } from '../../entities/rover.entity';
import { Zone } from '../../entities/zone.entity';
import { DeliveryController } from './delivery.controller';
import { Delivery } from '../../entities/delivery.entity';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    GameModule,
    TypeOrmModule.forFeature([
      Delivery,
      Order,
      Rover,
      Route,
      Zone,
      GameSession,
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
