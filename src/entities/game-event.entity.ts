import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { GameEventType } from '../common/enums/game.enums';
import { BaseEntity } from './base/base.entity';
import { GameSession } from './game-session.entity';

@Entity('game_events')
export class GameEvent extends BaseEntity {
  @Column({ name: 'game_session_id', type: 'uuid' })
  gameSessionId: string;

  @Column({ type: 'varchar', length: 40 })
  type: GameEventType;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  effects: Record<string, unknown>;

  @ManyToOne(() => GameSession, (session) => session.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_session_id' })
  gameSession: GameSession;
}
