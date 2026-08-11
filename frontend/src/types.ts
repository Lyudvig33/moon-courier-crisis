export type GameSessionStatus = 'ACTIVE' | 'WON' | 'LOST';
export type RoverStatus = 'AVAILABLE' | 'BUSY' | 'DAMAGED' | 'CHARGING';
export type OrderUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  riskMultiplier: number;
  speedMultiplier: number;
}

export interface Route {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  distance: number;
  baseRisk: number;
  fromZone?: Zone;
  toZone?: Zone;
}

export interface GameSummary {
  id: string;
  day: number;
  money: number;
  score: number;
  baseRating: number;
  status: GameSessionStatus;
  luckySignalActive: boolean;
  solarStormActive: boolean;
  routeRiskBonus: number;
  speedModifier: number;
  dustStormZoneId: string | null;
  stats: {
    delivered: number;
    failed: number;
    pending: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  };
}

export interface Order {
  id: string;
  destinationZoneId: string;
  weight: number;
  reward: number;
  urgency: OrderUrgency;
  risk: number;
  status: OrderStatus;
  expiresAt: string;
  destinationZone?: Zone;
}

export interface Rover {
  id: string;
  name: string;
  battery: number;
  maxCapacity: number;
  speed: number;
  baseConsumption: number;
  riskResistance: number;
  status: RoverStatus;
  currentZoneId: string;
  currentZone?: Zone;
}

export interface GameEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  effects: Record<string, unknown>;
  createdAt: string;
}

export interface PreviewError {
  code: string;
  message: string;
}

export interface DeliveryPreview {
  possible: boolean;
  distance?: number;
  cargoWeight?: number;
  batteryCost?: number;
  travelTime?: number;
  risk?: number;
  reward?: number;
  warnings: string[];
  errors: PreviewError[];
}

export interface DeliveryResult {
  delivery: {
    id: string;
    status: string;
    distance: number;
    cargoWeight: number;
    batteryCost: number;
    travelTime: number;
    finalRisk: number;
    reward: number;
  };
  success: boolean;
  moneyDelta: number;
  scoreDelta: number;
  batteryDelta: number;
  baseRatingDelta: number;
  message: string;
}

export interface NextDayResult {
  session: Omit<GameSummary, 'stats'>;
  event: GameEvent | null;
  finished: boolean;
  stats: {
    delivered: number;
    failed: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  };
}
