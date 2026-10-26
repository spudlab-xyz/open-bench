import type { AnalysisSettings, Experiment, Measurement } from '../types';

export interface DescriptiveStats {
  count: number;
  mean: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;
  range: number | null;
  sampleStandardDeviation: number | null;
}

export interface IndividualOutcome {
  specimenId: string;
  specimenName: string;
  conditionId: string;
  conditionName: string;
  runId: string;
  value: number;
}

export interface ConditionSummary {
  conditionId: string;
  conditionName: string;
  colour: string;
  values: IndividualOutcome[];
  stats: DescriptiveStats;
}

export function calculateStats(input: Array<number | null | undefined>): DescriptiveStats {
  const values = input.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) return { count: 0, mean: null, median: null, minimum: null, maximum: null, range: null, sampleStandardDeviation: null };
  const sorted = [...values].sort((left, right) => left - right);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const minimum = sorted[0];
  const maximum = sorted[sorted.length - 1];
  const sampleStandardDeviation = values.length < 2 ? null : Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  return { count: values.length, mean, median, minimum, maximum, range: maximum - minimum, sampleStandardDeviation };
}

export function pointOf(measurement: Measurement): number | string | undefined {
  return measurement.elapsed ?? measurement.observedAt;
}

function passesFilters(measurement: Measurement, settings: AnalysisSettings): boolean {
  return (!settings.conditionIds.length || settings.conditionIds.includes(measurement.conditionId))
    && (!settings.specimenIds.length || settings.specimenIds.includes(measurement.specimenId))
    && (!settings.runIds.length || settings.runIds.includes(measurement.runId));
}

export function calculateOutcomes(experiment: Experiment, settings: AnalysisSettings, excludedIds: string[] = []): IndividualOutcome[] {
  const excluded = new Set(excludedIds);
  const outcomes: IndividualOutcome[] = [];
  for (const specimen of experiment.specimens) {
    if (settings.specimenIds.length && !settings.specimenIds.includes(specimen.id)) continue;
    const candidateRuns = experiment.runs.filter((run) => run.specimenIds.includes(specimen.id) && (!settings.runIds.length || settings.runIds.includes(run.id)));
    // One outcome per physical specimen. A repeated cycle/run is not treated as another independent specimen.
    const run = candidateRuns.sort((left, right) => (left.cycle ?? 1) - (right.cycle ?? 1))[0];
    if (!run) continue;
    const readings = experiment.measurements.filter((measurement) => measurement.specimenId === specimen.id && measurement.runId === run.id && measurement.quality !== 'invalid' && passesFilters(measurement, settings) && !excluded.has(measurement.id));
    const end = readings.find((measurement) => pointOf(measurement) === settings.selectedPoint);
    const endValue = end?.values[settings.variableId];
    if (typeof endValue !== 'number') continue;
    let value = endValue;
    if (settings.comparison === 'change') {
      const baseline = readings.find((measurement) => pointOf(measurement) === settings.baselinePoint);
      const baselineValue = baseline?.values[settings.variableId];
      if (typeof baselineValue !== 'number') continue;
      value -= baselineValue;
    }
    const condition = experiment.conditions.find((item) => item.id === specimen.conditionId);
    if (!condition) continue;
    outcomes.push({ specimenId: specimen.id, specimenName: specimen.name, conditionId: condition.id, conditionName: condition.name, runId: run.id, value });
  }
  return outcomes;
}

export function summariseByCondition(experiment: Experiment, settings: AnalysisSettings, excludedIds: string[] = []): ConditionSummary[] {
  const outcomes = calculateOutcomes(experiment, settings, excludedIds);
  return experiment.conditions
    .filter((condition) => !settings.conditionIds.length || settings.conditionIds.includes(condition.id))
    .map((condition) => {
      const values = outcomes.filter((outcome) => outcome.conditionId === condition.id);
      return { conditionId: condition.id, conditionName: condition.name, colour: condition.colour, values, stats: calculateStats(values.map((outcome) => outcome.value)) };
    });
}

export function analysisMeasurementIds(experiment: Experiment, settings: AnalysisSettings, excludedIds: string[] = []): string[] {
  const excluded = new Set(excludedIds);
  const selected = new Set<number | string | undefined>([settings.selectedPoint]);
  if (settings.comparison === 'change') selected.add(settings.baselinePoint);
  return experiment.measurements
    .filter((measurement) => measurement.quality !== 'invalid' && passesFilters(measurement, settings) && !excluded.has(measurement.id) && selected.has(pointOf(measurement)))
    .map((measurement) => measurement.id)
    .sort();
}
