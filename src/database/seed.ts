import 'dotenv/config';
import {
  GameSessionStatus,
  OrderStatus,
  OrderUrgency,
  RoverStatus,
  Terrain,
} from '../common/enums/game.enums';
import { GameSession } from '../entities/game-session.entity';
import { Order } from '../entities/order.entity';
import { Route } from '../entities/route.entity';
import { Rover } from '../entities/rover.entity';
import { Zone } from '../entities/zone.entity';
import AppDataSource from './data-source';

async function seed() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const zoneRepo = AppDataSource.getRepository(Zone);
  const routeRepo = AppDataSource.getRepository(Route);
  const sessionRepo = AppDataSource.getRepository(GameSession);
  const roverRepo = AppDataSource.getRepository(Rover);
  const orderRepo = AppDataSource.getRepository(Order);

  let zones = await zoneRepo.find();
  if (zones.length === 0) {
    const zoneDefs = [
      {
        name: 'Base',
        x: 400,
        y: 300,
        terrain: Terrain.BASE,
        riskMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
      {
        name: 'Alpha Crater',
        x: 180,
        y: 160,
        terrain: Terrain.CRATER,
        riskMultiplier: 1.15,
        speedMultiplier: 0.9,
      },
      {
        name: 'North Ridge',
        x: 420,
        y: 80,
        terrain: Terrain.RIDGE,
        riskMultiplier: 1.25,
        speedMultiplier: 0.85,
      },
      {
        name: 'Red Valley',
        x: 640,
        y: 180,
        terrain: Terrain.ROCKY,
        riskMultiplier: 1.2,
        speedMultiplier: 0.95,
      },
      {
        name: 'Dust Valley',
        x: 620,
        y: 420,
        terrain: Terrain.DUST,
        riskMultiplier: 1.35,
        speedMultiplier: 0.75,
      },
      {
        name: 'Dark Side',
        x: 200,
        y: 460,
        terrain: Terrain.DARK_SIDE,
        riskMultiplier: 1.5,
        speedMultiplier: 0.7,
      },
    ];
    zones = await zoneRepo.save(zoneDefs.map((z) => zoneRepo.create(z)));

    const byName = Object.fromEntries(zones.map((z) => [z.name, z]));
    const routeDefs = [
      { from: 'Base', to: 'Alpha Crater', distance: 28, baseRisk: 12 },
      { from: 'Base', to: 'North Ridge', distance: 32, baseRisk: 18 },
      { from: 'Base', to: 'Red Valley', distance: 36, baseRisk: 15 },
      { from: 'Base', to: 'Dust Valley', distance: 40, baseRisk: 22 },
      { from: 'Base', to: 'Dark Side', distance: 80, baseRisk: 30 },
      { from: 'Alpha Crater', to: 'North Ridge', distance: 22, baseRisk: 14 },
      { from: 'Red Valley', to: 'Dust Valley', distance: 20, baseRisk: 16 },
      { from: 'Dust Valley', to: 'Dark Side', distance: 26, baseRisk: 24 },
    ];

    for (const r of routeDefs) {
      await routeRepo.save([
        routeRepo.create({
          fromZoneId: byName[r.from].id,
          toZoneId: byName[r.to].id,
          distance: r.distance,
          baseRisk: r.baseRisk,
        }),
        routeRepo.create({
          fromZoneId: byName[r.to].id,
          toZoneId: byName[r.from].id,
          distance: r.distance,
          baseRisk: r.baseRisk,
        }),
      ]);
    }
  }

  const active = await sessionRepo.findOne({
    where: { status: GameSessionStatus.ACTIVE },
  });
  if (active) {
    console.log('Active game session already exists:', active.id);
    await AppDataSource.destroy();
    return;
  }

  const byName = Object.fromEntries(zones.map((z) => [z.name, z]));
  const base = byName['Base'];

  const session = await sessionRepo.save(
    sessionRepo.create({
      day: 1,
      money: 500,
      score: 0,
      baseRating: 80,
      status: GameSessionStatus.ACTIVE,
    }),
  );

  await roverRepo.save([
    roverRepo.create({
      gameSessionId: session.id,
      name: 'Apollo',
      battery: 92,
      maxCapacity: 30,
      speed: 1.0,
      baseConsumption: 0.5,
      riskResistance: 10,
      status: RoverStatus.AVAILABLE,
      currentZoneId: base.id,
    }),
    roverRepo.create({
      gameSessionId: session.id,
      name: 'Luna',
      battery: 65,
      maxCapacity: 50,
      speed: 0.8,
      baseConsumption: 0.45,
      riskResistance: 20,
      status: RoverStatus.AVAILABLE,
      currentZoneId: base.id,
    }),
    roverRepo.create({
      gameSessionId: session.id,
      name: 'Scout',
      battery: 100,
      maxCapacity: 15,
      speed: 1.4,
      baseConsumption: 0.35,
      riskResistance: 0,
      status: RoverStatus.AVAILABLE,
      currentZoneId: base.id,
    }),
  ]);

  const expires = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  await orderRepo.save([
    orderRepo.create({
      gameSessionId: session.id,
      destinationZoneId: byName['Alpha Crater'].id,
      weight: 18,
      reward: 240,
      urgency: OrderUrgency.MEDIUM,
      risk: 12,
      status: OrderStatus.PENDING,
      expiresAt: expires(2),
    }),
    orderRepo.create({
      gameSessionId: session.id,
      destinationZoneId: byName['Red Valley'].id,
      weight: 45,
      reward: 420,
      urgency: OrderUrgency.HIGH,
      risk: 18,
      status: OrderStatus.PENDING,
      expiresAt: expires(3),
    }),
    orderRepo.create({
      gameSessionId: session.id,
      destinationZoneId: byName['Dark Side'].id,
      weight: 48,
      reward: 520,
      urgency: OrderUrgency.CRITICAL,
      risk: 25,
      status: OrderStatus.PENDING,
      expiresAt: expires(2),
    }),
    orderRepo.create({
      gameSessionId: session.id,
      destinationZoneId: byName['North Ridge'].id,
      weight: 10,
      reward: 160,
      urgency: OrderUrgency.LOW,
      risk: 8,
      status: OrderStatus.PENDING,
      expiresAt: expires(3),
    }),
    orderRepo.create({
      gameSessionId: session.id,
      destinationZoneId: byName['Dust Valley'].id,
      weight: 22,
      reward: 280,
      urgency: OrderUrgency.HIGH,
      risk: 20,
      status: OrderStatus.PENDING,
      expiresAt: expires(2),
    }),
    orderRepo.create({
      gameSessionId: session.id,
      destinationZoneId: byName['Alpha Crater'].id,
      weight: 8,
      reward: 120,
      urgency: OrderUrgency.LOW,
      risk: 5,
      status: OrderStatus.PENDING,
      expiresAt: expires(4),
    }),
  ]);

  console.log('Seed complete. Game session:', session.id);
  await AppDataSource.destroy();
}

seed().catch(async (err) => {
  console.error(err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
