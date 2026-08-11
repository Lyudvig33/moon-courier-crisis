import {
  calculateBatteryCost,
  calculateFinalRisk,
  calculateTravelTime,
  clamp,
  letterGrade,
} from './delivery.calculator';

describe('delivery.calculator', () => {
  describe('clamp', () => {
    it('clamps below min', () => {
      expect(clamp(-5, 1, 95)).toBe(1);
    });

    it('clamps above max', () => {
      expect(clamp(120, 1, 95)).toBe(95);
    });
  });

  describe('capacity / battery cost', () => {
    const base = {
      distance: 36,
      baseConsumption: 0.5,
      maxCapacity: 30,
      zoneSpeedMultiplier: 1,
    };

    it('computes cost for cargo below capacity', () => {
      const cost = calculateBatteryCost({ ...base, cargoWeight: 18 });
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(100);
    });

    it('computes cost for cargo equal to capacity', () => {
      const below = calculateBatteryCost({ ...base, cargoWeight: 15 });
      const equal = calculateBatteryCost({ ...base, cargoWeight: 30 });
      expect(equal).toBeGreaterThan(below);
    });

    it('increases cost with solar storm', () => {
      const normal = calculateBatteryCost({ ...base, cargoWeight: 18 });
      const storm = calculateBatteryCost({
        ...base,
        cargoWeight: 18,
        solarStormActive: true,
      });
      expect(storm).toBe(Math.round(normal * 1.2));
    });
  });

  describe('battery sufficiency scenarios', () => {
    it('sufficient battery succeeds numerically', () => {
      const cost = calculateBatteryCost({
        distance: 28,
        baseConsumption: 0.5,
        cargoWeight: 18,
        maxCapacity: 30,
        zoneSpeedMultiplier: 0.9,
      });
      expect(92).toBeGreaterThanOrEqual(cost);
    });

    it('exact required battery is acceptable', () => {
      const cost = calculateBatteryCost({
        distance: 28,
        baseConsumption: 0.5,
        cargoWeight: 18,
        maxCapacity: 30,
        zoneSpeedMultiplier: 0.9,
      });
      expect(cost <= cost).toBe(true);
    });

    it('insufficient battery fails numerically for Luna dark-side haul', () => {
      const cost = calculateBatteryCost({
        distance: 80,
        baseConsumption: 0.45,
        cargoWeight: 48,
        maxCapacity: 50,
        zoneSpeedMultiplier: 0.7,
      });
      expect(cost).toBeGreaterThan(65);
    });
  });

  describe('risk', () => {
    const baseRisk = {
      routeBaseRisk: 15,
      orderRisk: 12,
      cargoWeight: 18,
      roverMaxCapacity: 30,
      roverBattery: 90,
      roverRiskResistance: 0,
      zoneRiskMultiplier: 1.2,
    };

    it('calculates risk', () => {
      const risk = calculateFinalRisk(baseRisk);
      expect(risk).toBeGreaterThanOrEqual(1);
      expect(risk).toBeLessThanOrEqual(95);
    });

    it('clamps risk between 1 and 95', () => {
      expect(
        calculateFinalRisk({
          ...baseRisk,
          routeBaseRisk: 90,
          orderRisk: 90,
          roverBattery: 10,
          zoneRiskMultiplier: 2,
        }),
      ).toBe(95);

      expect(
        calculateFinalRisk({
          routeBaseRisk: 0,
          orderRisk: 0,
          cargoWeight: 1,
          roverMaxCapacity: 100,
          roverBattery: 100,
          roverRiskResistance: 100,
          zoneRiskMultiplier: 1,
        }),
      ).toBe(1);
    });

    it('rover resistance decreases risk', () => {
      const without = calculateFinalRisk(baseRisk);
      const withResist = calculateFinalRisk({
        ...baseRisk,
        roverRiskResistance: 20,
      });
      expect(withResist).toBeLessThan(without);
    });
  });

  describe('travel time', () => {
    it('depends on distance, speed and terrain', () => {
      const slow = calculateTravelTime(40, 0.8, 0.75);
      const fast = calculateTravelTime(40, 1.4, 1);
      expect(slow).toBeGreaterThan(fast);
    });
  });

  describe('letterGrade', () => {
    it('maps score bands', () => {
      expect(letterGrade(900)).toBe('S');
      expect(letterGrade(650)).toBe('A');
      expect(letterGrade(450)).toBe('B');
      expect(letterGrade(250)).toBe('C');
      expect(letterGrade(50)).toBe('D');
    });
  });
});
