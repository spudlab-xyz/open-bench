import { describe, expect, it } from 'vitest';
import { calculateOutcomes, calculateStats } from './calculations';
import { createSeedWorkspace } from '../data/seed';

describe('statistical calculations', () => {
  it('ignores missing values and uses sample standard deviation', () => {
    const stats = calculateStats([1, 2, null, undefined, 3]);
    expect(stats).toEqual({ count: 3, mean: 2, median: 2, minimum: 1, maximum: 3, range: 2, sampleStandardDeviation: 1 });
  });

  it('does not report sample standard deviation for one value', () => {
    expect(calculateStats([4]).sampleStandardDeviation).toBeNull();
  });

  it('does not substitute a nearest or missing observation', () => {
    const plant = createSeedWorkspace().experiments.find((item) => item.kind === 'plant')!;
    const settings = {
      variableId: 'height', comparison: 'observed' as const, selectedPoint: '2026-07-27', baselinePoint: undefined,
      conditionIds: ['plant-compost'], specimenIds: [], runIds: [], showTrajectories: true, chartType: 'line' as const,
    };
    expect(calculateOutcomes(plant, settings)).toHaveLength(2);
  });

  it('applies documented analysis exclusions without changing measurements', () => {
    const thermal = createSeedWorkspace().experiments[0];
    const settings = { ...thermal.analyses[0].settings, selectedPoint: 15 };
    const before = thermal.measurements.length;
    const outcomes = calculateOutcomes(thermal, settings, ['thermal-m-8-15']);
    expect(outcomes.some((item) => item.specimenId === 'thermal-assembly-3-2')).toBe(false);
    expect(thermal.measurements).toHaveLength(before);
  });

  it('does not include observations explicitly marked invalid', () => {
    const thermal = createSeedWorkspace().experiments[0];
    const settings = { ...thermal.analyses[0].settings, selectedPoint: 30 };
    const target = thermal.measurements.find((measurement) => measurement.elapsed === 30)!;
    target.quality = 'invalid';
    expect(calculateOutcomes(thermal, settings).some((outcome) => outcome.specimenId === target.specimenId)).toBe(false);
  });
});
