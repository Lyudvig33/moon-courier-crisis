import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { OrderStatus, OrderUrgency } from '../common/enums/game.enums';
import { BaseEntity } from './base/base.entity';
import { GameSession } from './game-session.entity';
import { Zone } from './zone.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ name: 'game_session_id', type: 'uuid' })
  gameSessionId: string;

  @Column({ name: 'destination_zone_id', type: 'uuid' })
  destinationZoneId: string;

  @Column({ type: 'float' })
  weight: number;

  @Column({ type: 'int' })
  reward: number;

  @Column({ type: 'varchar', length: 20 })
  urgency: OrderUrgency;

  @Column({ type: 'float' })
  risk: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ManyToOne(() => GameSession, (session) => session.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_session_id' })
  gameSession: GameSession;

  @ManyToOne(() => Zone, (zone) => zone.orders)
  @JoinColumn({ name: 'destination_zone_id' })
  destinationZone: Zone;
}
