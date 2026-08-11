import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { Zone } from './zone.entity';

@Entity('routes')
export class Route extends BaseEntity {
  @Column({ name: 'from_zone_id', type: 'uuid' })
  fromZoneId: string;

  @Column({ name: 'to_zone_id', type: 'uuid' })
  toZoneId: string;

  @Column({ type: 'float' })
  distance: number;

  @Column({ type: 'float', name: 'base_risk' })
  baseRisk: number;

  @ManyToOne(() => Zone, (zone) => zone.outgoingRoutes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_zone_id' })
  fromZone: Zone;

  @ManyToOne(() => Zone, (zone) => zone.incomingRoutes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_zone_id' })
  toZone: Zone;
}
