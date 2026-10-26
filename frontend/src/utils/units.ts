export const ELAPSED_TIME_UNIT = 'min';

export function explicitUnit(unit?: string): string {
  return unit?.trim() || 'unit not specified';
}

export function formatValueWithUnit(value: number | string, unit?: string): string {
  return `${value} ${explicitUnit(unit)}`;
}

export function formatLabelWithUnit(label: string, unit?: string): string {
  const statedUnit = explicitUnit(unit);
  return label.includes(statedUnit) ? label : `${label} (${statedUnit})`;
}

export function formatMeasurementPoint(point: number | string, usesObservationDates: boolean): string {
  return usesObservationDates ? String(point) : formatValueWithUnit(point, ELAPSED_TIME_UNIT);
}
