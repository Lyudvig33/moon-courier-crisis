import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  GameSessionStatus,
  OrderStatus,
  RoverStatus,
  Terrain,
} from '../../common/enums/game.enums';
import { Delivery } from '../../entities/delivery.entity';
import { GameEvent } from '../../entities/game-event.entity';
import { Order } from '../../entities/order.entity';
import { Route } from '../../entities/route.entity';
import { Rover } from '../../entities/rover.entity';
import { Zone } from '../../entities/zone.entity';
import { GameSession } from '../../entities/game-session.entity';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;

  const session: GameSession = {
    id: 'session-1',
    day: 1,
    money: 500,
    score: 100,
    baseRating: 80,
    status: GameSessionStatus.ACTIVE,
    luckySignalActive: false,
    solarStormActive: false,
    routeRiskBonus: 0,
    speedModifier: 1,
    dustStormZoneId: null,
  } as GameSession;

  const zones: Zone[] = [
    {
      id: 'z-base',
      name: 'Base',
      terrain: Terrain.BASE,
      x: 0,
      y: 0,
      riskMultiplier: 1,
      speedMultiplier: 1,
    } as Zone,
    {
      id: 'z-alpha',
      name: 'Alpha Crater',
      terrain: Terrain.CRATER,
      x: 1,
      y: 1,
      riskMultiplier: 1.1,
      speedMultiplier: 0.9,
    } as Zone,
  ];

  const sessionRepo = {
    findOne: jest.fn(),
    create: jest.fn((x: GameSession) => x),
    save: jest.fn((x: GameSession) => Promise.resolve(x)),
    count: jest.fn(),
  };
  const zoneRepo = { find: jest.fn() };
  const routeRepo = { find: jest.fn() };
  const roverRepo = { find: jest.fn(), save: jest.fn() };
  const orderRepo = {
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((x: Order) => x),
    save: jest.fn(),
  };
  const deliveryRepo = { find: jest.fn() };
  const eventRepo = {
    find: jest.fn(),
    create: jest.fn((x: GameEvent) => x),
    save: jest.fn(),
  };

  const manager = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((_e: unknown, data: Record<string, unknown>) => ({
      id: 'new',
      ...data,
    })),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
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
        GameService,
        { provide: getRepositoryToken(GameSession), useValue: sessionRepo },
        { provide: getRepositoryToken(Zone), useValue: zoneRepo },
        { provide: getRepositoryToken(Route), useValue: routeRepo },
        { provide: getRepositoryToken(Rover), useValue: roverRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Delivery), useValue: deliveryRepo },
        { provide: getRepositoryToken(GameEvent), useValue: eventRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(GameService);

    sessionRepo.findOne.mockResolvedValue({ ...session });
    orderRepo.count.mockResolvedValue(0);
    manager.findOne.mockResolvedValue({ ...session });
    manager.find.mockImplementation((entity: unknown) => {
      if (entity === Zone) return Promise.resolve(zones);
      if (entity === Rover)
        return Promise.resolve([
          {
            id: 'r1',
            status: RoverStatus.AVAILABLE,
            battery: 50,
            gameSessionId: session.id,
          },
        ]);
      if (entity === Order) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  // RNG must stay in [0, 1); 1.0 makes Math.floor(r * n) === n (OOB)
  const noEventRng = () => 0.5;

  it('next day increments day', async () => {
    const result = await service.nextDay(noEventRng);
    expect(result.session.day).toBe(2);
    expect(result.finished).toBe(false);
  });

  it('expires outdated pending orders', async () => {
    const expired = {
      id: 'o1',
      status: OrderStatus.PENDING,
      expiresAt: new Date(Date.now() - 1000),
      gameSessionId: session.id,
    };
    manager.find.mockImplementation((entity: unknown) => {
      if (entity === Zone) return Promise.resolve(zones);
      if (entity === Rover) return Promise.resolve([]);
      if (entity === Order) return Promise.resolve([expired]);
      return Promise.resolve([]);
    });

    await service.nextDay(noEventRng);
    expect(expired.status).toBe(OrderStatus.EXPIRED);
  });

  it('ends game after day 7', async () => {
    manager.findOne.mockResolvedValue({
      ...session,
      day: 7,
      baseRating: 50,
    });
    const result = await service.nextDay(noEventRng);
    expect(result.session.status).toBe(GameSessionStatus.WON);
    expect(result.finished).toBe(true);
    expect(result.stats.grade).toBeTruthy();
  });
});
