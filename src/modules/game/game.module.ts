import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from '../../entities/delivery.entity';
import { GameEvent } from '../../entities/game-event.entity';
import { Order } from '../../entities/order.entity';
import { Route } from '../../entities/route.entity';
import { Rover } from '../../entities/rover.entity';
import { Zone } from '../../entities/zone.entity';
import { GameController } from './game.controller';
import { GameSession } from '../../entities/game-session.entity';
import { GameService } from './game.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSession,
      Zone,
      Route,
      Rover,
      Order,
      Delivery,
      GameEvent,
    ]),
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService, TypeOrmModule],
})
export class GameModule {}
