import { Column, Entity, OneToMany } from 'typeorm';
import { Terrain } from '../common/enums/game.enums';
import { Route } from './route.entity';
import { Rover } from './rover.entity';
import { Order } from './order.entity';
import { BaseEntity } from './base/base.entity';

@Entity('zones')
export class Zone extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'float' })
  x: number;

  @Column({ type: 'float' })
  y: number;

  @Column({ type: 'varchar', length: 30 })
  terrain: Terrain;

  @Column({ type: 'float', name: 'risk_multiplier', default: 1 })
  riskMultiplier: number;

  @Column({ type: 'float', name: 'speed_multiplier', default: 1 })
  speedMultiplier: number;

  @OneToMany(() => Route, (route) => route.fromZone)
  outgoingRoutes: Route[];

  @OneToMany(() => Route, (route) => route.toZone)
  incomingRoutes: Route[];

  @OneToMany(() => Rover, (rover) => rover.currentZone)
  rovers: Rover[];

  @OneToMany(() => Order, (order) => order.destinationZone)
  orders: Order[];
}
