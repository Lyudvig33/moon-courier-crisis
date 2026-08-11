import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DeliveryStatus } from '../common/enums/game.enums';
import { BaseEntity } from './base/base.entity';
import { GameSession } from './game-session.entity';
import { Order } from './order.entity';
import { Rover } from './rover.entity';
import { Route } from './route.entity';

@Entity('deliveries')
export class Delivery extends BaseEntity {
  @Column({ name: 'game_session_id', type: 'uuid' })
  gameSessionId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'rover_id', type: 'uuid' })
  roverId: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @Column({ type: 'float' })
  distance: number;

  @Column({ type: 'float', name: 'cargo_weight' })
  cargoWeight: number;

  @Column({ type: 'float', name: 'battery_cost' })
  batteryCost: number;

  @Column({ type: 'float', name: 'travel_time' })
  travelTime: number;

  @Column({ type: 'float', name: 'final_risk' })
  finalRisk: number;

  @Column({ type: 'int' })
  reward: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: DeliveryStatus.PREPARING,
  })
  status: DeliveryStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => GameSession, (session) => session.deliveries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_session_id' })
  gameSession: GameSession;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Rover, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rover_id' })
  rover: Rover;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;
}
