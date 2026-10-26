import { describe, expect, it } from 'vitest';
import { explicitUnit, formatLabelWithUnit, formatMeasurementPoint, formatValueWithUnit } from './units';

describe('explicit unit presentation', () => {
  it('never presents a numeric value without a unit state', () => {
    expect(formatValueWithUnit(12.5, '°C')).toBe('12.5 °C');
    expect(formatValueWithUnit(1, '')).toBe('1 unit not specified');
    expect(explicitUnit(undefined)).toBe('unit not specified');
  });

  it('labels elapsed points in minutes without changing calendar dates', () => {
    expect(formatMeasurementPoint(15, false)).toBe('15 min');
    expect(formatMeasurementPoint('2026-10-25', true)).toBe('2026-10-25');
  });

  it('does not duplicate a unit already present in a label', () => {
    expect(formatLabelWithUnit('Temperature', '°C')).toBe('Temperature (°C)');
    expect(formatLabelWithUnit('Temperature (°C)', '°C')).toBe('Temperature (°C)');
  });
});
