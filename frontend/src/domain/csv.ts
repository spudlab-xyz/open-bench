import Papa from 'papaparse';
import type { Experiment, Measurement } from '../types';

export interface CsvMapping {
  specimen: string;
  run: string;
  point: string;
  value: string;
  unit: string;
  notes?: string;
}

export interface CsvPreviewRow {
  rowNumber: number;
  measurement?: Measurement;
  issues: string[];
  raw: Record<string, string>;
}

export function parseCsv(text: string): { fields: string[]; rows: Record<string, string>[]; parseErrors: string[] } {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim() });
  return { fields: result.meta.fields ?? [], rows: result.data, parseErrors: result.errors.map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`) };
}

export function previewCsv(experiment: Experiment, rows: Record<string, string>[], mapping: CsvMapping, expectedUnit: string): CsvPreviewRow[] {
  return rows.map((raw, index) => {
    const issues: string[] = [];
    const specimen = experiment.specimens.find((item) => item.name === raw[mapping.specimen] || item.id === raw[mapping.specimen]);
    const run = experiment.runs.find((item) => item.name === raw[mapping.run] || item.id === raw[mapping.run]);
    const valueText = raw[mapping.value]?.trim();
    const value = valueText === '' || valueText == null ? null : Number(valueText);
    if (!specimen) issues.push('Unknown specimen identity.');
    if (!run) issues.push('Unknown run identity.');
    if (run && specimen && !run.specimenIds.includes(specimen.id)) issues.push('Specimen is not associated with this run.');
    if (value === null) issues.push('Blank values stay missing and cannot be committed as a measurement.');
    else if (!Number.isFinite(value)) issues.push('Measured value is not numeric.');
    if (raw[mapping.unit]?.trim() !== expectedUnit) issues.push(`Unsupported or mismatched unit; expected ${expectedUnit}.`);
    const pointText = raw[mapping.point]?.trim();
    let elapsed: number | undefined;
    let observedAt: string | undefined;
    if (experiment.kind === 'plant') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pointText ?? '')) issues.push('Observation date must be unambiguous ISO YYYY-MM-DD.');
      else observedAt = pointText;
    } else {
      elapsed = Number(pointText);
      if (!Number.isFinite(elapsed) || elapsed < 0) issues.push('Elapsed time must be a non-negative number.');
    }
    if (specimen && run && experiment.measurements.some((measurement) => measurement.specimenId === specimen.id && measurement.runId === run.id && (experiment.kind === 'plant' ? measurement.observedAt === observedAt : measurement.elapsed === elapsed))) {
      issues.push('A reading already exists for this specimen, run and time/date. Existing readings are never overwritten.');
    }
    const variable = experiment.variables.find((item) => item.role === 'outcome')!;
    const measurement = !issues.length && specimen && run && value !== null ? {
      id: `csv-${Date.now()}-${index}`, specimenId: specimen.id, runId: run.id, conditionId: specimen.conditionId,
      elapsed, observedAt, values: { [variable.id]: value }, quality: 'valid' as const, notes: mapping.notes ? raw[mapping.notes] ?? '' : '', corrections: [], recordedAt: new Date().toISOString(),
    } : undefined;
    return { rowNumber: index + 2, measurement, issues, raw };
  });
}

export function measurementsToCsv(experiment: Experiment): string {
  const rows = experiment.measurements.map((measurement) => {
    const specimen = experiment.specimens.find((item) => item.id === measurement.specimenId);
    const run = experiment.runs.find((item) => item.id === measurement.runId);
    const condition = experiment.conditions.find((item) => item.id === measurement.conditionId);
    return Object.fromEntries([
      ['measurement_id', measurement.id], ['condition', condition?.name ?? ''], ['specimen', specimen?.name ?? ''], ['run', run?.name ?? ''],
      ['elapsed_or_date', measurement.elapsed ?? measurement.observedAt ?? ''], ...experiment.variables.flatMap((variable) => [[variable.name, measurement.values[variable.id] ?? ''], [`${variable.name}_unit`, variable.unit]]),
      ['quality', measurement.quality], ['notes', measurement.notes], ['corrected', measurement.corrections.length ? 'yes' : 'no'],
    ]);
  });
  return Papa.unparse(rows, { escapeFormulae: true });
}

export function exampleCsv(experiment: Experiment): string {
  const variable = experiment.variables.find((item) => item.role === 'outcome')!;
  const specimen = experiment.specimens[0];
  const run = experiment.runs.find((item) => item.specimenIds.includes(specimen.id))!;
  return Papa.unparse([{
    specimen: specimen.name,
    run: run.name,
    [experiment.kind === 'plant' ? 'observation_date' : 'elapsed']: experiment.kind === 'plant' ? '2026-08-17' : '35',
    value: '',
    unit: variable.unit,
    notes: 'Enter a value; blanks are not converted to zero.',
  }], { escapeFormulae: true });
}
