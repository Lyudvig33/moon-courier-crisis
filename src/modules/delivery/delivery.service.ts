import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import {
  BusinessErrorCode,
  DeliveryStatus,
  GameSessionStatus,
  OrderStatus,
  RoverStatus,
} from '../../common/enums/game.enums';
import { BusinessException } from '../../common/exceptions/business.exception';
import { GameSession } from '../../entities/game-session.entity';
import { Order } from '../../entities/order.entity';
import { Rover } from '../../entities/rover.entity';
import { Route } from '../../entities/route.entity';
import { Zone } from '../../entities/zone.entity';
import {
  calculateBatteryCost,
  calculateFinalRisk,
  calculateTravelTime,
} from './delivery.calculator';
import { Delivery } from '../../entities/delivery.entity';
import {
  DeliveryPreviewResult,
  DeliveryResultResponse,
  PreviewError,
} from './delivery.types';
import { defaultRandom, RandomFn } from './random';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Rover)
    private readonly roverRepository: Repository<Rover>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(gameSessionId?: string): Promise<Delivery[]> {
    const where = gameSessionId ? { gameSessionId } : {};
    return this.deliveryRepository.find({
      where,
      order: { startedAt: 'DESC' },
      relations: ['order', 'rover', 'route'],
    });
  }

  async findOne(id: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id },
      relations: ['order', 'rover', 'route'],
    });
    if (!delivery) {
      throw new BusinessException(
        BusinessErrorCode.DELIVERY_NOT_FOUND,
        `Delivery ${id} not found`,
        404,
      );
    }
    return delivery;
  }

  async preview(
    orderId: string,
    roverId: string,
  ): Promise<DeliveryPreviewResult> {
    const computed = await this.computeDelivery(orderId, roverId, false);
    return computed.preview;
  }

  async start(
    orderId: string,
    roverId: string,
    random: RandomFn = defaultRandom,
  ): Promise<DeliveryResultResponse> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Lock without relations — Postgres forbids FOR UPDATE on LEFT JOIN sides
        const order = await manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) {
          throw new BusinessException(
            BusinessErrorCode.ORDER_NOT_FOUND,
            `Order ${orderId} not found`,
            404,
          );
        }

        const rover = await manager.findOne(Rover, {
          where: { id: roverId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!rover) {
          throw new BusinessException(
            BusinessErrorCode.ROVER_NOT_FOUND,
            `Rover ${roverId} not found`,
            404,
          );
        }

        const session = await manager.findOne(GameSession, {
          where: { id: order.gameSessionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!session) {
          throw new BusinessException(
            BusinessErrorCode.GAME_NOT_FOUND,
            'Game session not found',
            404,
          );
        }

        const existing = await manager.findOne(Delivery, {
          where: { orderId: order.id },
        });
        if (existing) {
          throw new BusinessException(
            BusinessErrorCode.ORDER_ALREADY_DELIVERED,
            'This order already has a delivery',
          );
        }

        const computed = await this.computeDeliveryFromEntities(
          order,
          rover,
          session,
          manager,
        );

        if (!isReadyDelivery(computed)) {
          const first = computed.preview.errors[0];
          throw new BusinessException(
            (first?.code as BusinessErrorCode) ??
              BusinessErrorCode.ORDER_NOT_AVAILABLE,
            first?.message ?? 'Delivery is not possible',
          );
        }

        const {
          route,
          destination,
          batteryCost,
          travelTime,
          finalRisk,
          reward,
          baseZone,
        } = computed;

        let moneyDelta = 0;
        let paidReward = reward;
        if (session.luckySignalActive) {
          paidReward = Math.round(reward * 1.2);
        }

        const delivery = manager.create(Delivery, {
          gameSessionId: session.id,
          orderId: order.id,
          roverId: rover.id,
          routeId: route.id,
          distance: route.distance,
          cargoWeight: order.weight,
          batteryCost,
          travelTime,
          finalRisk,
          reward: paidReward,
          status: DeliveryStatus.IN_PROGRESS,
          startedAt: new Date(),
        });
        await manager.save(delivery);

        rover.status = RoverStatus.BUSY;
        order.status = OrderStatus.IN_TRANSIT;
        await manager.save(rover);
        await manager.save(order);

        const successChance = 100 - finalRisk;
        const roll = random() * 100;
        const success = roll < successChance;

        let scoreDelta = 0;
        let baseRatingDelta = 0;
        const batteryDelta = -batteryCost;

        rover.battery = Math.max(0, Math.min(100, rover.battery - batteryCost));
        // Rovers redeploy from Base; routes are always Base → destination
        rover.currentZoneId = baseZone.id;

        if (success) {
          delivery.status = DeliveryStatus.COMPLETED;
          delivery.completedAt = new Date();
          order.status = OrderStatus.DELIVERED;
          rover.status = RoverStatus.AVAILABLE;

          moneyDelta = paidReward;
          if (session.luckySignalActive) {
            session.luckySignalActive = false;
          }
          scoreDelta = Math.floor(reward / 2);
          baseRatingDelta = 1;

          session.money += moneyDelta;
          session.score += scoreDelta;
          session.baseRating = Math.min(
            100,
            session.baseRating + baseRatingDelta,
          );
        } else {
          delivery.status = DeliveryStatus.FAILED;
          delivery.completedAt = new Date();
          order.status = OrderStatus.FAILED;
          scoreDelta = -20;
          baseRatingDelta = -5;
          session.score = Math.max(0, session.score + scoreDelta);
          session.baseRating = Math.max(0, session.baseRating + baseRatingDelta);

          if (finalRisk >= 60) {
            rover.status = RoverStatus.DAMAGED;
          } else {
            rover.status = RoverStatus.AVAILABLE;
          }

          if (session.baseRating <= 0) {
            session.status = GameSessionStatus.LOST;
          }
        }

        await manager.save(delivery);
        await manager.save(order);
        await manager.save(rover);
        await manager.save(session);

        return {
          delivery: {
            id: delivery.id,
            status: delivery.status,
            distance: delivery.distance,
            cargoWeight: delivery.cargoWeight,
            batteryCost: delivery.batteryCost,
            travelTime: delivery.travelTime,
            finalRisk: delivery.finalRisk,
            reward: delivery.reward,
          },
          success,
          moneyDelta,
          scoreDelta,
          batteryDelta,
          baseRatingDelta,
          message: success ? 'Delivery completed!' : 'Delivery failed!',
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BusinessException(
          BusinessErrorCode.ORDER_ALREADY_DELIVERED,
          'This order already has a delivery',
        );
      }
      throw error;
    }
  }

  private async computeDelivery(
    orderId: string,
    roverId: string,
    throwOnMissing: boolean,
  ): Promise<ComputedDelivery> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['destinationZone'],
    });
    if (!order) {
      if (throwOnMissing) {
        throw new BusinessException(
          BusinessErrorCode.ORDER_NOT_FOUND,
          `Order ${orderId} not found`,
          404,
        );
      }
      return {
        preview: {
          possible: false,
          warnings: [],
          errors: [
            {
              code: BusinessErrorCode.ORDER_NOT_FOUND,
              message: `Order ${orderId} not found`,
            },
          ],
        },
      };
    }

    const rover = await this.roverRepository.findOne({
      where: { id: roverId },
      relations: ['currentZone'],
    });
    if (!rover) {
      if (throwOnMissing) {
        throw new BusinessException(
          BusinessErrorCode.ROVER_NOT_FOUND,
          `Rover ${roverId} not found`,
          404,
        );
      }
      return {
        preview: {
          possible: false,
          warnings: [],
          errors: [
            {
              code: BusinessErrorCode.ROVER_NOT_FOUND,
              message: `Rover ${roverId} not found`,
            },
          ],
        },
      };
    }

    const session = await this.gameSessionRepository.findOne({
      where: { id: order.gameSessionId },
    });
    if (!session) {
      return {
        preview: {
          possible: false,
          warnings: [],
          errors: [
            {
              code: BusinessErrorCode.GAME_NOT_FOUND,
              message: 'Game session not found',
            },
          ],
        },
      };
    }

    return this.computeDeliveryFromEntities(order, rover, session);
  }

  private async computeDeliveryFromEntities(
    order: Order,
    rover: Rover,
    session: GameSession,
    manager?: EntityManager,
  ): Promise<ComputedDelivery> {
    const errors: PreviewError[] = [];
    const warnings: string[] = [];
    const zoneRepo = manager ? manager.getRepository(Zone) : this.zoneRepository;
    const routeRepo = manager
      ? manager.getRepository(Route)
      : this.routeRepository;

    if (session.status !== GameSessionStatus.ACTIVE) {
      errors.push({
        code: BusinessErrorCode.GAME_ALREADY_FINISHED,
        message: 'Game is already finished',
      });
      return { preview: { possible: false, warnings, errors } };
    }

    if (rover.gameSessionId !== session.id) {
      errors.push({
        code: BusinessErrorCode.ROVER_NOT_FOUND,
        message: 'Rover does not belong to the active game session',
      });
    }

    if (order.status === OrderStatus.DELIVERED) {
      errors.push({
        code: BusinessErrorCode.ORDER_ALREADY_DELIVERED,
        message: 'Order has already been delivered',
      });
    } else if (order.status === OrderStatus.EXPIRED) {
      errors.push({
        code: BusinessErrorCode.ORDER_EXPIRED,
        message: 'Order has expired',
      });
    } else if (
      order.status === OrderStatus.PENDING &&
      order.expiresAt <= new Date()
    ) {
      errors.push({
        code: BusinessErrorCode.ORDER_EXPIRED,
        message: 'Order has expired',
      });
    } else if (order.status !== OrderStatus.PENDING) {
      errors.push({
        code: BusinessErrorCode.ORDER_NOT_AVAILABLE,
        message: `Order is not available (status: ${order.status})`,
      });
    }

    if (rover.status !== RoverStatus.AVAILABLE) {
      errors.push({
        code: BusinessErrorCode.ROVER_NOT_AVAILABLE,
        message: `Rover is not available (status: ${rover.status})`,
      });
    }

    if (order.weight > rover.maxCapacity) {
      errors.push({
        code: BusinessErrorCode.CARGO_TOO_HEAVY,
        message: `Cargo weight ${order.weight} exceeds rover capacity ${rover.maxCapacity}`,
      });
    }

    const baseZone = await zoneRepo.findOne({
      where: { name: 'Base' },
    });
    if (!baseZone) {
      errors.push({
        code: BusinessErrorCode.ZONE_NOT_FOUND,
        message: 'Base zone not found',
      });
      return { preview: { possible: false, warnings, errors } };
    }

    const route = await routeRepo.findOne({
      where: {
        fromZoneId: baseZone.id,
        toZoneId: order.destinationZoneId,
      },
      relations: ['toZone', 'fromZone'],
    });

    if (!route) {
      errors.push({
        code: BusinessErrorCode.ROUTE_NOT_FOUND,
        message: 'No route from Base to destination',
      });
      return { preview: { possible: false, warnings, errors } };
    }

    const destination =
      order.destinationZone ??
      (await zoneRepo.findOne({ where: { id: order.destinationZoneId } }));
    if (!destination) {
      errors.push({
        code: BusinessErrorCode.ZONE_NOT_FOUND,
        message: 'Destination zone not found',
      });
      return { preview: { possible: false, warnings, errors } };
    }

    let speedMultiplier = destination.speedMultiplier;
    if (session.dustStormZoneId && session.dustStormZoneId === destination.id) {
      speedMultiplier *= session.speedModifier;
    }

    const batteryCost = calculateBatteryCost({
      distance: route.distance,
      baseConsumption: rover.baseConsumption,
      cargoWeight: order.weight,
      maxCapacity: rover.maxCapacity,
      zoneSpeedMultiplier: speedMultiplier,
      solarStormActive: session.solarStormActive,
    });

    if (batteryCost > rover.battery) {
      errors.push({
        code: BusinessErrorCode.INSUFFICIENT_BATTERY,
        message: `Required battery: ${batteryCost}%. Current battery: ${rover.battery}%.`,
      });
    }

    const travelTime = calculateTravelTime(
      route.distance,
      rover.speed,
      speedMultiplier,
      1,
    );

    let eventRiskBonus = session.routeRiskBonus;
    if (session.dustStormZoneId && session.dustStormZoneId === destination.id) {
      eventRiskBonus += 20;
    }

    const finalRisk = calculateFinalRisk({
      routeBaseRisk: route.baseRisk,
      orderRisk: order.risk,
      cargoWeight: order.weight,
      roverMaxCapacity: rover.maxCapacity,
      roverBattery: rover.battery,
      roverRiskResistance: rover.riskResistance,
      zoneRiskMultiplier: destination.riskMultiplier,
      eventRiskBonus,
    });

    if (finalRisk >= 60) {
      warnings.push('High risk delivery');
    } else if (finalRisk >= 40) {
      warnings.push('Medium risk');
    }

    if (order.weight === rover.maxCapacity) {
      warnings.push('Cargo at maximum capacity');
    }

    const metrics = {
      order,
      rover,
      route,
      session,
      destination,
      baseZone,
      batteryCost,
      travelTime,
      finalRisk,
      reward: order.reward,
    };

    if (errors.length > 0) {
      return {
        preview: {
          possible: false,
          distance: route.distance,
          cargoWeight: order.weight,
          batteryCost,
          travelTime,
          risk: finalRisk,
          reward: order.reward,
          warnings,
          errors,
        },
        ...metrics,
      };
    }

    return {
      preview: {
        possible: true,
        distance: route.distance,
        cargoWeight: order.weight,
        batteryCost,
        travelTime,
        risk: finalRisk,
        reward: order.reward,
        warnings,
        errors: [],
      },
      ...metrics,
    };
  }
}

interface ReadyDelivery {
  preview: DeliveryPreviewResult & { possible: true };
  order: Order;
  rover: Rover;
  route: Route;
  session: GameSession;
  destination: Zone;
  baseZone: Zone;
  batteryCost: number;
  travelTime: number;
  finalRisk: number;
  reward: number;
}

type ComputedDelivery =
  | ReadyDelivery
  | {
      preview: DeliveryPreviewResult;
      order?: Order;
      rover?: Rover;
      route?: Route;
      session?: GameSession;
      destination?: Zone;
      baseZone?: Zone;
      batteryCost?: number;
      travelTime?: number;
      finalRisk?: number;
      reward?: number;
    };

function isReadyDelivery(value: ComputedDelivery): value is ReadyDelivery {
  return value.preview.possible === true;
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === '23505';
}
