import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { Delivery } from './entities/delivery.entity';
import { EventModule } from './modules/event/event.module';
import { GameEvent } from './entities/game-event.entity';
import { GameModule } from './modules/game/game.module';
import { GameSession } from './entities/game-session.entity';
import { OrderModule } from './modules/order/order.module';
import { Order } from './entities/order.entity';
import { RouteModule } from './modules/route/route.module';
import { Route } from './entities/route.entity';
import { RoverModule } from './modules/rover/rover.module';
import { Rover } from './entities/rover.entity';
import { ZoneModule } from './modules/zone/zone.module';
import { Zone } from './entities/zone.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [GameSession, Zone, Route, Rover, Order, Delivery, GameEvent],
        synchronize: false,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
      }),
    }),
    ZoneModule,
    RouteModule,
    RoverModule,
    OrderModule,
    EventModule,
    GameModule,
    DeliveryModule,
  ],
})
export class AppModule {}
