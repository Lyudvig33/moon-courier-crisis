import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RoverStatus } from '../common/enums/game.enums';
import { BaseEntity } from './base/base.entity';
import { GameSession } from './game-session.entity';
import { Zone } from './zone.entity';

@Entity('rovers')
export class Rover extends BaseEntity {
  @Column({ name: 'game_session_id', type: 'uuid' })
  gameSessionId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'float', default: 100 })
  battery: number;

  @Column({ type: 'float', name: 'max_capacity' })
  maxCapacity: number;

  @Column({ type: 'float', default: 1 })
  speed: number;

  @Column({ type: 'float', name: 'base_consumption' })
  baseConsumption: number;

  @Column({ type: 'float', name: 'risk_resistance', default: 0 })
  riskResistance: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: RoverStatus.AVAILABLE,
  })
  status: RoverStatus;

  @Column({ name: 'current_zone_id', type: 'uuid' })
  currentZoneId: string;

  @ManyToOne(() => GameSession, (session) => session.rovers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_session_id' })
  gameSession: GameSession;

  @ManyToOne(() => Zone, (zone) => zone.rovers)
  @JoinColumn({ name: 'current_zone_id' })
  currentZone: Zone;
}
