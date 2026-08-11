export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface RiskInput {
  routeBaseRisk: number;
  orderRisk: number;
  cargoWeight: number;
  roverMaxCapacity: number;
  roverBattery: number;
  roverRiskResistance: number;
  zoneRiskMultiplier: number;
  eventRiskBonus?: number;
}

export function calculateFinalRisk(input: RiskInput): number {
  const loadRatio = input.cargoWeight / input.roverMaxCapacity;
  const loadRisk = loadRatio * 15;
  const batteryRisk =
    input.roverBattery < 30 ? 20 : input.roverBattery < 50 ? 10 : 0;
  const zoneRiskBonus = (input.zoneRiskMultiplier - 1) * 20;
  const eventRiskBonus = input.eventRiskBonus ?? 0;

  const raw =
    input.routeBaseRisk +
    input.orderRisk +
    loadRisk +
    batteryRisk +
    zoneRiskBonus -
    input.roverRiskResistance +
    eventRiskBonus;

  return clamp(Math.round(raw), 1, 95);
}

export interface BatteryCostInput {
  distance: number;
  baseConsumption: number;
  cargoWeight: number;
  maxCapacity: number;
  zoneSpeedMultiplier: number;
  solarStormActive?: boolean;
}

export function calculateBatteryCost(input: BatteryCostInput): number {
  const loadRatio = input.cargoWeight / input.maxCapacity;
  const loadMultiplier = 1 + loadRatio * 0.5;
  const terrainMultiplier = clamp(1 / input.zoneSpeedMultiplier, 0.8, 1.5);
  let cost =
    input.distance * input.baseConsumption * loadMultiplier * terrainMultiplier;

  if (input.solarStormActive) {
    cost *= 1.2;
  }

  return Math.round(cost);
}

export function calculateTravelTime(
  distance: number,
  roverSpeed: number,
  zoneSpeedMultiplier: number,
  speedModifier = 1,
): number {
  const effectiveSpeed = roverSpeed * zoneSpeedMultiplier * speedModifier;
  return Math.ceil(distance / Math.max(effectiveSpeed, 0.1));
}

export function letterGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 800) return 'S';
  if (score >= 600) return 'A';
  if (score >= 400) return 'B';
  if (score >= 200) return 'C';
  return 'D';
}
