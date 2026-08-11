import { Column, Entity, OneToMany } from 'typeorm';
import { GameSessionStatus } from '../common/enums/game.enums';
import { BaseEntity } from './base/base.entity';
import { Rover } from './rover.entity';
import { Order } from './order.entity';
import { Delivery } from './delivery.entity';
import { GameEvent } from './game-event.entity';

@Entity('game_sessions')
export class GameSession extends BaseEntity {
  @Column({ type: 'int', default: 1 })
  day: number;

  @Column({ type: 'int', default: 500 })
  money: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 80, name: 'base_rating' })
  baseRating: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: GameSessionStatus.ACTIVE,
  })
  status: GameSessionStatus;

  @Column({ type: 'boolean', default: false, name: 'lucky_signal_active' })
  luckySignalActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'solar_storm_active' })
  solarStormActive: boolean;

  @Column({ type: 'float', default: 0, name: 'route_risk_bonus' })
  routeRiskBonus: number;

  @Column({ type: 'float', default: 1, name: 'speed_modifier' })
  speedModifier: number;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    name: 'dust_storm_zone_id',
  })
  dustStormZoneId: string | null;

  @OneToMany(() => Rover, (rover) => rover.gameSession)
  rovers: Rover[];

  @OneToMany(() => Order, (order) => order.gameSession)
  orders: Order[];

  @OneToMany(() => Delivery, (delivery) => delivery.gameSession)
  deliveries: Delivery[];

  @OneToMany(() => GameEvent, (event) => event.gameSession)
  events: GameEvent[];
}
