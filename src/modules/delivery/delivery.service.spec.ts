import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BusinessErrorCode,
  DeliveryStatus,
  GameSessionStatus,
  OrderStatus,
  OrderUrgency,
  RoverStatus,
  Terrain,
} from '../../common/enums/game.enums';
import { BusinessException } from '../../common/exceptions/business.exception';
import { GameSession } from '../../entities/game-session.entity';
import { Order } from '../../entities/order.entity';
import { Route } from '../../entities/route.entity';
import { Rover } from '../../entities/rover.entity';
import { Zone } from '../../entities/zone.entity';
import { Delivery } from '../../entities/delivery.entity';
import { DeliveryService } from './delivery.service';

describe('DeliveryService', () => {
  let service: DeliveryService;

  const baseZone: Zone = {
    id: 'zone-base',
    name: 'Base',
    x: 400,
    y: 300,
    terrain: Terrain.BASE,
    riskMultiplier: 1,
    speedMultiplier: 1,
  } as Zone;

  const destZone: Zone = {
    id: 'zone-alpha',
    name: 'Alpha Crater',
    x: 180,
    y: 160,
    terrain: Terrain.CRATER,
    riskMultiplier: 1.15,
    speedMultiplier: 0.9,
  } as Zone;

  const session: GameSession = {
    id: 'session-1',
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
  } as GameSession;

  const order: Order = {
    id: 'order-1',
    gameSessionId: 'session-1',
    destinationZoneId: destZone.id,
    weight: 18,
    reward: 240,
    urgency: OrderUrgency.MEDIUM,
    risk: 12,
    status: OrderStatus.PENDING,
    expiresAt: new Date(Date.now() + 86_400_000),
    destinationZone: destZone,
  } as Order;

  const heavyOrder: Order = {
    ...order,
    id: 'order-heavy',
    weight: 45,
    reward: 420,
  };

  const rover: Rover = {
    id: 'rover-apollo',
    gameSessionId: 'session-1',
    name: 'Apollo',
    battery: 92,
    maxCapacity: 30,
    speed: 1,
    baseConsumption: 0.5,
    riskResistance: 10,
    status: RoverStatus.AVAILABLE,
    currentZoneId: baseZone.id,
  } as Rover;

  const route: Route = {
    id: 'route-1',
    fromZoneId: baseZone.id,
    toZoneId: destZone.id,
    distance: 28,
    baseRisk: 12,
  } as Route;

  const orderRepo = {
    findOne: jest.fn(),
  };
  const roverRepo = {
    findOne: jest.fn(),
  };
  const routeRepo = {
    findOne: jest.fn(),
  };
  const zoneRepo = {
    findOne: jest.fn(),
  };
  const sessionRepo = {
    findOne: jest.fn(),
  };
  const deliveryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const manager = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Zone) return zoneRepo;
      if (entity === Route) return routeRepo;
      return { findOne: jest.fn() };
    }),
  };

  const dataSource = {
    transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
      Promise.resolve(cb(manager)),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: getRepositoryToken(Delivery), useValue: deliveryRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Rover), useValue: roverRepo },
        { provide: getRepositoryToken(Route), useValue: routeRepo },
        { provide: getRepositoryToken(Zone), useValue: zoneRepo },
        { provide: getRepositoryToken(GameSession), useValue: sessionRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(DeliveryService);

    orderRepo.findOne.mockResolvedValue({
      ...order,
      destinationZone: destZone,
    });
    roverRepo.findOne.mockResolvedValue({ ...rover });
    sessionRepo.findOne.mockResolvedValue({ ...session });
    zoneRepo.findOne.mockResolvedValue(baseZone);
    routeRepo.findOne.mockResolvedValue(route);

    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Order) {
        return Promise.resolve({ ...order, destinationZone: destZone });
      }
      if (entity === Rover) {
        return Promise.resolve({ ...rover });
      }
      if (entity === GameSession) {
        return Promise.resolve({ ...session });
      }
      if (entity === Zone) {
        return Promise.resolve(baseZone);
      }
      if (entity === Route) {
        return Promise.resolve(route);
      }
      if (entity === Delivery) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
  });

  it('preview allows cargo below capacity', async () => {
    const preview = await service.preview(order.id, rover.id);
    expect(preview.possible).toBe(true);
    expect(preview.errors).toHaveLength(0);
  });

  it('preview allows cargo equal to capacity', async () => {
    orderRepo.findOne.mockResolvedValue({
      ...order,
      weight: 30,
      destinationZone: destZone,
    });
    const preview = await service.preview(order.id, rover.id);
    expect(preview.possible).toBe(true);
  });

  it('preview fails when cargo above capacity', async () => {
    orderRepo.findOne.mockResolvedValue({
      ...heavyOrder,
      destinationZone: destZone,
    });
    const preview = await service.preview(heavyOrder.id, rover.id);
    expect(preview.possible).toBe(false);
    expect(preview.errors[0].code).toBe(BusinessErrorCode.CARGO_TOO_HEAVY);
  });

  it('preview fails when battery is insufficient', async () => {
    roverRepo.findOne.mockResolvedValue({ ...rover, battery: 5 });
    const preview = await service.preview(order.id, rover.id);
    expect(preview.possible).toBe(false);
    expect(preview.errors[0].code).toBe(BusinessErrorCode.INSUFFICIENT_BATTERY);
  });

  it('starts a valid delivery', async () => {
    const result = await service.start(order.id, rover.id, () => 0);
    expect(result.success).toBe(true);
    expect(result.delivery.status).toBe(DeliveryStatus.COMPLETED);
    expect(result.moneyDelta).toBeGreaterThan(0);
  });

  it('blocks busy rover', async () => {
    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Order) {
        return Promise.resolve({ ...order, destinationZone: destZone });
      }
      if (entity === Rover) {
        return Promise.resolve({ ...rover, status: RoverStatus.BUSY });
      }
      if (entity === GameSession) {
        return Promise.resolve({ ...session });
      }
      return Promise.resolve(null);
    });
    await expect(service.start(order.id, rover.id)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it('blocks already delivered order', async () => {
    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Order) {
        return Promise.resolve({
          ...order,
          status: OrderStatus.DELIVERED,
          destinationZone: destZone,
        });
      }
      if (entity === Rover) {
        return Promise.resolve({ ...rover });
      }
      if (entity === GameSession) {
        return Promise.resolve({ ...session });
      }
      return Promise.resolve(null);
    });
    await expect(service.start(order.id, rover.id)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it('blocks insufficient battery on start', async () => {
    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Order) {
        return Promise.resolve({ ...order, destinationZone: destZone });
      }
      if (entity === Rover) {
        return Promise.resolve({ ...rover, battery: 1 });
      }
      if (entity === GameSession) {
        return Promise.resolve({ ...session });
      }
      if (entity === Zone) {
        return Promise.resolve(baseZone);
      }
      if (entity === Route) {
        return Promise.resolve(route);
      }
      if (entity === Delivery) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
    await expect(service.start(order.id, rover.id)).rejects.toMatchObject({
      code: BusinessErrorCode.INSUFFICIENT_BATTERY,
    });
  });

  it('blocks expired orders on start', async () => {
    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Order) {
        return Promise.resolve({
          ...order,
          expiresAt: new Date(Date.now() - 1000),
          destinationZone: destZone,
        });
      }
      if (entity === Rover) {
        return Promise.resolve({ ...rover });
      }
      if (entity === GameSession) {
        return Promise.resolve({ ...session });
      }
      return Promise.resolve(null);
    });
    await expect(service.start(order.id, rover.id)).rejects.toMatchObject({
      code: BusinessErrorCode.ORDER_EXPIRED,
    });
  });
});
