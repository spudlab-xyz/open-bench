import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { calculateOutcomes, pointOf } from '../domain/calculations';
import type { AnalysisSettings, Experiment } from '../types';
import { ELAPSED_TIME_UNIT, explicitUnit, formatMeasurementPoint, formatValueWithUnit } from '../utils/units';

export function ExperimentChart({ experiment, variableId, settings, excludedIds = [], selectedMeasurementId, compact = false }: {
  experiment: Experiment;
  variableId: string;
  settings?: AnalysisSettings;
  excludedIds?: string[];
  selectedMeasurementId?: string;
  compact?: boolean;
}) {
  const variable = experiment.variables.find((item) => item.id === variableId);
  if (!variable) return <div className="chart-empty">Choose a measured variable to chart.</div>;
  const variableUnit = explicitUnit(variable.unit);
  const excluded = new Set(excludedIds);
  if (settings?.chartType === 'comparison') {
    const outcomes = calculateOutcomes(experiment, settings, excludedIds);
    const points = outcomes.map((outcome) => ({ ...outcome, x: experiment.conditions.findIndex((condition) => condition.id === outcome.conditionId) + 1 }));
    return <div className={compact ? 'chart chart-compact' : 'chart'}><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 18, right: 20, bottom: 12, left: 4 }}><CartesianGrid stroke="#435057" strokeDasharray="3 3" /><XAxis dataKey="x" type="number" domain={[0.5, experiment.conditions.length + 0.5]} ticks={experiment.conditions.map((_, index) => index + 1)} tickFormatter={(value) => experiment.conditions[value - 1]?.name ?? ''} stroke="#9eabb4" /><YAxis dataKey="value" name={variable.name} unit={` ${variableUnit}`} stroke="#9eabb4" /><ZAxis range={[85, 85]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#252c30', border: '1px solid #4a565c' }} formatter={(value) => [formatValueWithUnit(Number(value).toFixed(2), variableUnit), variable.name]} labelFormatter={(_, payload) => payload[0]?.payload.specimenName ?? ''} />{experiment.conditions.map((condition) => <Scatter key={condition.id} name={condition.name} data={points.filter((point) => point.conditionId === condition.id)} fill={condition.colour} shape="circle" />)}<Legend /></ScatterChart></ResponsiveContainer></div>;
  }
  const filtered = experiment.measurements.filter((measurement) => measurement.quality !== 'invalid' && !excluded.has(measurement.id)
    && (!settings?.conditionIds.length || settings.conditionIds.includes(measurement.conditionId))
    && (!settings?.specimenIds.length || settings.specimenIds.includes(measurement.specimenId))
    && (!settings?.runIds.length || settings.runIds.includes(measurement.runId)));
  const points = [...new Set(filtered.map(pointOf).filter((point): point is number | string => point !== undefined))].sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }));
  const rows = points.map((point) => {
    const row: Record<string, number | string | null> = { point };
    experiment.conditions.forEach((condition) => {
      const values = filtered.filter((measurement) => measurement.conditionId === condition.id && pointOf(measurement) === point).map((measurement) => measurement.values[variableId]).filter((value): value is number => typeof value === 'number');
      row[`condition:${condition.id}`] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    });
    if (settings?.showTrajectories) experiment.specimens.forEach((specimen) => {
      const reading = filtered.find((measurement) => measurement.specimenId === specimen.id && pointOf(measurement) === point);
      row[`specimen:${specimen.id}`] = typeof reading?.values[variableId] === 'number' ? reading.values[variableId] : null;
    });
    return row;
  });
  const selected = experiment.measurements.find((item) => item.id === selectedMeasurementId);
  const selectedValue = selected?.values[variableId];
  return <div className={compact ? 'chart chart-compact' : 'chart'}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 16, right: 22, bottom: 12, left: 4 }}><CartesianGrid stroke="#435057" strokeDasharray="3 3" /><XAxis dataKey="point" stroke="#9eabb4" label={{ value: experiment.kind === 'plant' ? 'Observation date' : `Elapsed time (${ELAPSED_TIME_UNIT})`, position: 'insideBottom', offset: -8, fill: '#9eabb4' }} /><YAxis stroke="#9eabb4" label={{ value: `${variable.name} (${variableUnit})`, angle: -90, position: 'insideLeft', fill: '#9eabb4' }} /><Tooltip contentStyle={{ background: '#252c30', border: '1px solid #4a565c' }} formatter={(value) => [formatValueWithUnit(Number(value).toFixed(2), variableUnit)]} labelFormatter={(point) => formatMeasurementPoint(String(point ?? ''), experiment.kind === 'plant')} /><Legend />{settings?.showTrajectories && experiment.specimens.map((specimen) => {
    const condition = experiment.conditions.find((item) => item.id === specimen.conditionId)!;
    return <Line key={specimen.id} dataKey={`specimen:${specimen.id}`} name={specimen.name} stroke={condition.colour} strokeWidth={1} strokeOpacity={0.3} dot={false} connectNulls={false} legendType="none" />;
  })}{experiment.conditions.filter((condition) => !settings?.conditionIds.length || settings.conditionIds.includes(condition.id)).map((condition) => <Line key={condition.id} dataKey={`condition:${condition.id}`} name={`${condition.name} — derived mean`} stroke={condition.colour} strokeWidth={settings?.chartType === 'scatter' ? 0 : 2.5} dot={{ r: settings?.chartType === 'scatter' ? 4 : 2.5 }} connectNulls={false} />)}{selected && typeof selectedValue === 'number' && <ReferenceDot x={pointOf(selected)} y={selectedValue} r={7} fill="#E12885" stroke="#fff" />}</LineChart></ResponsiveContainer></div>;
}
