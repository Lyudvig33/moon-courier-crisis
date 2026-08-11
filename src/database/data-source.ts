import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Delivery } from '../entities/delivery.entity';
import { GameEvent } from '../entities/game-event.entity';
import { GameSession } from '../entities/game-session.entity';
import { Order } from '../entities/order.entity';
import { Route } from '../entities/route.entity';
import { Rover } from '../entities/rover.entity';
import { Zone } from '../entities/zone.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'moon_courier',
  entities: [GameSession, Zone, Route, Rover, Order, Delivery, GameEvent],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default AppDataSource;
