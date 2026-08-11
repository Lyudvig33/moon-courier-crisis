import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BusinessErrorCode,
  GameEventType,
  GameSessionStatus,
  OrderStatus,
  OrderUrgency,
  RoverStatus,
  Terrain,
} from '../../common/enums/game.enums';
import { BusinessException } from '../../common/exceptions/business.exception';
import { letterGrade } from '../delivery/delivery.calculator';
import { Delivery } from '../../entities/delivery.entity';
import { GameEvent } from '../../entities/game-event.entity';
import { Order } from '../../entities/order.entity';
import { Route } from '../../entities/route.entity';
import { Rover } from '../../entities/rover.entity';
import { Zone } from '../../entities/zone.entity';
import { GameSession } from '../../entities/game-session.entity';
import { defaultRandom, RandomFn } from '../delivery/random';

const MAX_DAY = 7;

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Rover)
    private readonly roverRepository: Repository<Rover>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(GameEvent)
    private readonly eventRepository: Repository<GameEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async getActiveSession(): Promise<GameSession> {
    const session = await this.gameSessionRepository.findOne({
      where: { status: GameSessionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (session) {
      return session;
    }

    const latest = await this.gameSessionRepository.findOne({
      order: { createdAt: 'DESC' },
      where: {},
    });

    if (latest) {
      return latest;
    }

    return this.createNewGameSession();
  }

  async getGameSummary() {
    const session = await this.getActiveSession();
    return this.buildGameSummary(session);
  }

  private async buildGameSummary(session: GameSession) {
    const [delivered, failed, pending] = await Promise.all([
      this.orderRepository.count({
        where: { gameSessionId: session.id, status: OrderStatus.DELIVERED },
      }),
      this.orderRepository.count({
        where: { gameSessionId: session.id, status: OrderStatus.FAILED },
      }),
      this.orderRepository.count({
        where: { gameSessionId: session.id, status: OrderStatus.PENDING },
      }),
    ]);

    return {
      ...session,
      stats: {
        delivered,
        failed,
        pending,
        grade:
          session.status === GameSessionStatus.ACTIVE
            ? null
            : letterGrade(session.score),
      },
    };
  }

  async getMap() {
    const [zones, routes] = await Promise.all([
      this.zoneRepository.find({ order: { name: 'ASC' } }),
      this.routeRepository.find({
        relations: ['fromZone', 'toZone'],
      }),
    ]);
    return { zones, routes };
  }

  async getOrders() {
    const session = await this.getActiveSession();
    return this.orderRepository.find({
      where: { gameSessionId: session.id },
      relations: ['destinationZone'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRovers() {
    const session = await this.getActiveSession();
    return this.roverRepository.find({
      where: { gameSessionId: session.id },
      relations: ['currentZone'],
      order: { name: 'ASC' },
    });
  }

  async getEvents() {
    const session = await this.getActiveSession();
    return this.eventRepository.find({
      where: { gameSessionId: session.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createNewGame() {
    const session = await this.createNewGameSession();
    return this.buildGameSummary(session);
  }

  private async createNewGameSession(): Promise<GameSession> {
    return this.dataSource.transaction(async (manager) => {
      const activeSessions = await manager.find(GameSession, {
        where: { status: GameSessionStatus.ACTIVE },
      });
      for (const active of activeSessions) {
        active.status = GameSessionStatus.LOST;
        await manager.save(active);
      }

      let zones = await manager.find(Zone);
      if (zones.length === 0) {
        zones = await this.seedMap(manager);
      }

      const base = zones.find((z) => z.name === 'Base');
      if (!base) {
        throw new BusinessException(
          BusinessErrorCode.ZONE_NOT_FOUND,
          'Base zone missing from map seed',
        );
      }

      const session = manager.create(GameSession, {
        day: 1,
        money: 500,
        score: 0,
        baseRating: 80,
        status: GameSessionStatus.ACTIVE,
        luckySignalActive: false,
        solarStormActive: false,
        routeRiskBonus: 0,
        speedModifier: 1,
        dustStormZoneId: null,
      });
      await manager.save(session);

      const roverDefs = [
        {
          name: 'Apollo',
          battery: 92,
          maxCapacity: 30,
          speed: 1.0,
          baseConsumption: 0.5,
          riskResistance: 10,
        },
        {
          name: 'Luna',
          battery: 65,
          maxCapacity: 50,
          speed: 0.8,
          baseConsumption: 0.45,
          riskResistance: 20,
        },
        {
          name: 'Scout',
          battery: 100,
          maxCapacity: 15,
          speed: 1.4,
          baseConsumption: 0.35,
          riskResistance: 0,
        },
      ];

      for (const def of roverDefs) {
        await manager.save(
          manager.create(Rover, {
            ...def,
            gameSessionId: session.id,
            status: RoverStatus.AVAILABLE,
            currentZoneId: base.id,
          }),
        );
      }

      await this.createInitialOrders(manager, session.id, zones);

      return session;
    });
  }

  async nextDay(random: RandomFn = defaultRandom) {
    const session = await this.getActiveSession();

    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new BusinessException(
        BusinessErrorCode.GAME_ALREADY_FINISHED,
        'Game is already finished',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(GameSession, {
        where: { id: session.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.status !== GameSessionStatus.ACTIVE) {
        throw new BusinessException(
          BusinessErrorCode.GAME_ALREADY_FINISHED,
          'Game is already finished',
        );
      }

      // Expire old pending orders
      const now = new Date();
      const pendingOrders = await manager.find(Order, {
        where: { gameSessionId: locked.id, status: OrderStatus.PENDING },
        lock: { mode: 'pessimistic_write' },
      });
      for (const order of pendingOrders) {
        if (order.expiresAt <= now) {
          order.status = OrderStatus.EXPIRED;
          await manager.save(order);
        }
      }

      // Clear day-scoped modifiers from previous day
      locked.solarStormActive = false;
      locked.routeRiskBonus = 0;
      locked.speedModifier = 1;
      locked.dustStormZoneId = null;

      // Recharge rovers
      const rovers = await manager.find(Rover, {
        where: { gameSessionId: locked.id },
        lock: { mode: 'pessimistic_write' },
      });
      for (const rover of rovers) {
        if (rover.status === RoverStatus.BUSY) {
          continue;
        }
        rover.battery = Math.min(100, rover.battery + 15);
        if (rover.status === RoverStatus.DAMAGED) {
          rover.status = RoverStatus.AVAILABLE;
        } else if (rover.status === RoverStatus.CHARGING) {
          rover.status = RoverStatus.AVAILABLE;
        }
        // Redeploy at Base each day so Base → destination routing stays consistent
        const base = await manager.findOne(Zone, { where: { name: 'Base' } });
        if (base) {
          rover.currentZoneId = base.id;
        }
        await manager.save(rover);
      }

      if (locked.day >= MAX_DAY) {
        locked.status =
          locked.baseRating > 0
            ? GameSessionStatus.WON
            : GameSessionStatus.LOST;
        await manager.save(locked);
        return this.buildDayResult(locked, null);
      }

      locked.day += 1;

      const zones = await manager.find(Zone);

      let event: GameEvent | null = null;
      let orderRiskBonus = 0;
      if (random() < 0.4) {
        event = await this.generateRandomEvent(
          manager,
          locked,
          zones,
          rovers,
          random,
        );
        if (event?.type === GameEventType.COMMUNICATION_FAILURE) {
          orderRiskBonus = 5;
        }
      }

      await this.generateDailyOrders(
        manager,
        locked.id,
        zones,
        locked.day,
        random,
        orderRiskBonus,
      );

      if (locked.baseRating <= 0) {
        locked.status = GameSessionStatus.LOST;
      }

      await manager.save(locked);
      return this.buildDayResult(locked, event);
    });
  }

  private async buildDayResult(session: GameSession, event: GameEvent | null) {
    const [delivered, failed] = await Promise.all([
      this.orderRepository.count({
        where: { gameSessionId: session.id, status: OrderStatus.DELIVERED },
      }),
      this.orderRepository.count({
        where: { gameSessionId: session.id, status: OrderStatus.FAILED },
      }),
    ]);

    return {
      session,
      event,
      finished: session.status !== GameSessionStatus.ACTIVE,
      stats: {
        delivered,
        failed,
        grade:
          session.status === GameSessionStatus.ACTIVE
            ? null
            : letterGrade(session.score),
      },
    };
  }

  private async generateRandomEvent(
    manager: DataSource['manager'],
    session: GameSession,
    zones: Zone[],
    rovers: Rover[],
    random: RandomFn,
  ): Promise<GameEvent> {
    const types = Object.values(GameEventType);
    const type = types[Math.floor(random() * types.length)];
    let title = '';
    let description = '';
    let effects: Record<string, unknown> = {};

    switch (type) {
      case GameEventType.SOLAR_STORM:
        title = 'Solar Storm';
        description =
          'A solar storm lashes the surface. Battery consumption +20%, route risk +10.';
        effects = { batteryConsumptionBonus: 0.2, routeRiskBonus: 10 };
        session.solarStormActive = true;
        session.routeRiskBonus = 10;
        break;
      case GameEventType.DUST_STORM: {
        const candidates = zones.filter((z) => z.terrain !== Terrain.BASE);
        const zone =
          candidates[Math.floor(random() * candidates.length)] ?? zones[0];
        title = 'Dust Storm';
        description = `A dust storm blankets ${zone.name}. Speed -30%, risk +20 in that zone.`;
        effects = {
          zoneId: zone.id,
          zoneName: zone.name,
          speedModifier: 0.7,
          riskBonus: 20,
        };
        session.dustStormZoneId = zone.id;
        session.speedModifier = 0.7;
        break;
      }
      case GameEventType.COMMUNICATION_FAILURE:
        title = 'Communication Failure';
        description =
          'Comms flicker across the basin. New orders today arrive with +5 risk.';
        effects = { orderRiskBonus: 5 };
        break;
      case GameEventType.LUCKY_SIGNAL:
        title = 'Lucky Signal';
        description =
          'A lucky relay bounce! Next successful delivery pays +20% reward.';
        effects = { rewardBonus: 0.2 };
        session.luckySignalActive = true;
        break;
      case GameEventType.EQUIPMENT_FAILURE: {
        const available = rovers.filter(
          (r) => r.status === RoverStatus.AVAILABLE,
        );
        const target =
          available[Math.floor(random() * available.length)] ?? rovers[0];
        if (target) {
          target.status = RoverStatus.DAMAGED;
          await manager.save(target);
          title = 'Equipment Failure';
          description = `${target.name} suffers a mechanical fault and is temporarily DAMAGED.`;
          effects = { roverId: target.id, roverName: target.name };
        } else {
          title = 'Equipment Failure';
          description =
            'Systems glitch briefly, but no rover is available to damage.';
          effects = {};
        }
        break;
      }
    }

    const event = manager.create(GameEvent, {
      gameSessionId: session.id,
      type,
      title,
      description,
      effects,
    });
    await manager.save(event);
    return event;
  }

  private async createInitialOrders(
    manager: DataSource['manager'],
    sessionId: string,
    zones: Zone[],
  ) {
    const byName = Object.fromEntries(zones.map((z) => [z.name, z]));
    const expires = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

    const defs = [
      {
        destinationZoneId: byName['Alpha Crater'].id,
        weight: 18,
        reward: 240,
        urgency: OrderUrgency.MEDIUM,
        risk: 12,
        expiresAt: expires(2),
      },
      {
        // Heavy: exceeds Apollo (30) and Scout (15); Luna (50) can take it
        destinationZoneId: byName['Red Valley'].id,
        weight: 45,
        reward: 420,
        urgency: OrderUrgency.HIGH,
        risk: 18,
        expiresAt: expires(3),
      },
      {
        // Battery trap for Luna (65): long dark-side haul exceeds remaining charge
        destinationZoneId: byName['Dark Side'].id,
        weight: 48,
        reward: 520,
        urgency: OrderUrgency.CRITICAL,
        risk: 25,
        expiresAt: expires(2),
      },
      {
        destinationZoneId: byName['North Ridge'].id,
        weight: 10,
        reward: 160,
        urgency: OrderUrgency.LOW,
        risk: 8,
        expiresAt: expires(3),
      },
      {
        destinationZoneId: byName['Dust Valley'].id,
        weight: 22,
        reward: 280,
        urgency: OrderUrgency.HIGH,
        risk: 20,
        expiresAt: expires(2),
      },
      {
        destinationZoneId: byName['Alpha Crater'].id,
        weight: 8,
        reward: 120,
        urgency: OrderUrgency.LOW,
        risk: 5,
        expiresAt: expires(4),
      },
    ];

    for (const def of defs) {
      await manager.save(
        manager.create(Order, {
          ...def,
          gameSessionId: sessionId,
          status: OrderStatus.PENDING,
        }),
      );
    }
  }

  private async generateDailyOrders(
    manager: DataSource['manager'],
    sessionId: string,
    zones: Zone[],
    day: number,
    random: RandomFn = defaultRandom,
    orderRiskBonus = 0,
  ) {
    const destinations = zones.filter((z) => z.terrain !== Terrain.BASE);
    const count = 2 + Math.floor(random() * 3);
    const urgencies = Object.values(OrderUrgency);

    for (let i = 0; i < count; i++) {
      const zone =
        destinations[Math.floor(random() * destinations.length)];
      const weight = 5 + Math.floor(random() * 46);
      const urgency = urgencies[Math.floor(random() * urgencies.length)];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1 + Math.floor(random() * 2));

      await manager.save(
        manager.create(Order, {
          gameSessionId: sessionId,
          destinationZoneId: zone.id,
          weight,
          reward: Math.round(100 + weight * 8 + day * 10),
          urgency,
          risk: Math.min(
            95,
            5 + Math.floor(random() * 25) + orderRiskBonus,
          ),
          status: OrderStatus.PENDING,
          expiresAt,
        }),
      );
    }
  }

  private async seedMap(manager: DataSource['manager']): Promise<Zone[]> {
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

    const zones: Zone[] = [];
    for (const def of zoneDefs) {
      const zone = await manager.save(manager.create(Zone, def));
      zones.push(zone);
    }

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
      await manager.save(
        manager.create(Route, {
          fromZoneId: byName[r.from].id,
          toZoneId: byName[r.to].id,
          distance: r.distance,
          baseRisk: r.baseRisk,
        }),
      );
      // Bidirectional for map display / return paths
      await manager.save(
        manager.create(Route, {
          fromZoneId: byName[r.to].id,
          toZoneId: byName[r.from].id,
          distance: r.distance,
          baseRisk: r.baseRisk,
        }),
      );
    }

    return zones;
  }
}
