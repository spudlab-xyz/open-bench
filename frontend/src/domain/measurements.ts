import type { Experiment, Measurement, MeasurementSnapshot, QualityStatus } from '../types';

export interface MeasurementAuditState {
  id: string;
  label: string;
  timestamp?: string;
  reason?: string;
  source: 'recorded' | 'legacy-correction' | 'revision';
  snapshot: MeasurementSnapshot;
}

export interface MeasurementSnapshotComparison {
  values: Array<{ variableId: string; before: number | null | undefined; after: number | null | undefined; changed: boolean }>;
  quality: { before: QualityStatus; after: QualityStatus; changed: boolean };
  notes: { before: string; after: string; changed: boolean };
  changedFields: number;
}

function cloneSnapshot(snapshot: MeasurementSnapshot): MeasurementSnapshot {
  return { values: { ...snapshot.values }, quality: snapshot.quality, notes: snapshot.notes };
}

export function snapshotMeasurement(measurement: Measurement): MeasurementSnapshot {
  return { values: { ...measurement.values }, quality: measurement.quality, notes: measurement.notes };
}

function snapshotsEqual(before: MeasurementSnapshot, after: MeasurementSnapshot): boolean {
  const variableIds = new Set([...Object.keys(before.values), ...Object.keys(after.values)]);
  return before.quality === after.quality
    && before.notes === after.notes
    && [...variableIds].every((id) => before.values[id] === after.values[id]);
}

export function reviseMeasurement(
  experiment: Experiment,
  measurementId: string,
  desired: MeasurementSnapshot,
  reason: string,
  timestamp = new Date().toISOString(),
): Experiment {
  if (!reason.trim()) throw new Error('A measurement revision note is required.');
  let found = false;
  const measurements = experiment.measurements.map((measurement) => {
    if (measurement.id !== measurementId) return measurement;
    found = true;
    const before = snapshotMeasurement(measurement);
    const after = cloneSnapshot(desired);
    if (snapshotsEqual(before, after)) throw new Error('Change a value, quality status, or note before saving a measurement revision.');
    const changedVariables = [...new Set([...Object.keys(before.values), ...Object.keys(after.values)])]
      .filter((variableId) => before.values[variableId] !== after.values[variableId]);
    const corrections = [...measurement.corrections];
    changedVariables.forEach((variableId) => {
      const previousValue = before.values[variableId];
      const replacementValue = after.values[variableId];
      if (typeof previousValue === 'number' && typeof replacementValue === 'number') {
        corrections.push({
          id: `correction-${measurement.id}-${corrections.length + 1}`,
          variableId,
          previousValue,
          replacementValue,
          reason: reason.trim(),
          timestamp,
        });
      }
    });
    const revisions = measurement.revisions ?? [];
    const affectedAnalysisIds = experiment.analyses
      .filter((analysis) => !analysis.includedMeasurementIds?.length || analysis.includedMeasurementIds.includes(measurement.id))
      .map((analysis) => analysis.id);
    const valueMetadata = { ...(measurement.valueMetadata ?? {}) };
    changedVariables.forEach((variableId) => {
      valueMetadata[variableId] = { ...(valueMetadata[variableId] ?? { kind: 'raw-observation' }), kind: 'corrected-observation' };
    });
    return {
      ...measurement,
      values: { ...after.values },
      quality: after.quality,
      qualityReason: before.quality !== after.quality ? reason.trim() : measurement.qualityReason,
      notes: after.notes,
      valueMetadata,
      corrections,
      revisions: [...revisions, {
        id: `measurement-revision-${measurement.id}-${revisions.length + 1}`,
        revision: (revisions.at(-1)?.revision ?? 0) + 1,
        reason: reason.trim(),
        timestamp,
        before,
        after,
        affectedAnalysisIds,
        affectedConclusion: Boolean(experiment.conclusion),
      }],
    };
  });
  if (!found) throw new Error('Measurement not found.');
  return { ...experiment, measurements, dataRevision: experiment.dataRevision + 1, updatedAt: timestamp };
}

export function correctMeasurement(experiment: Experiment, measurementId: string, variableId: string, replacementValue: number, reason: string, timestamp = new Date().toISOString()): Experiment {
  if (!Number.isFinite(replacementValue)) throw new Error('The replacement value must be numeric.');
  const measurement = experiment.measurements.find((item) => item.id === measurementId);
  if (!measurement) throw new Error('Measurement not found.');
  if (typeof measurement.values[variableId] !== 'number') throw new Error('The selected value cannot be corrected because it is missing.');
  const desired = snapshotMeasurement(measurement);
  desired.values[variableId] = replacementValue;
  return reviseMeasurement(experiment, measurementId, desired, reason, timestamp);
}

export function buildMeasurementAuditStates(measurement: Measurement): MeasurementAuditState[] {
  const revisions = measurement.revisions ?? [];
  if (revisions.length) {
    const representedCorrectionIds = new Set(measurement.corrections.filter((correction) => revisions.some((revision) => revision.timestamp === correction.timestamp
      && revision.reason === correction.reason
      && revision.before.values[correction.variableId] === correction.previousValue
      && revision.after.values[correction.variableId] === correction.replacementValue)).map((correction) => correction.id));
    const legacyCorrections = measurement.corrections.filter((correction) => !representedCorrectionIds.has(correction.id));
    const baseline = cloneSnapshot(revisions[0].before);
    [...legacyCorrections].reverse().forEach((correction) => { baseline.values[correction.variableId] = correction.previousValue; });
    const states: MeasurementAuditState[] = [{ id: 'tracked-baseline', label: legacyCorrections.length ? 'Originally recorded' : 'Before tracked revisions', source: 'recorded', snapshot: cloneSnapshot(baseline) }];
    let legacyState = cloneSnapshot(baseline);
    legacyCorrections.forEach((correction, index) => {
      legacyState = cloneSnapshot(legacyState);
      legacyState.values[correction.variableId] = correction.replacementValue;
      states.push({ id: `legacy-${correction.id}`, label: `Legacy correction ${index + 1}`, timestamp: correction.timestamp, reason: correction.reason, source: 'legacy-correction', snapshot: cloneSnapshot(legacyState) });
    });
    states.push(...revisions.map((revision) => ({
        id: revision.id,
        label: `Revision ${revision.revision}`,
        timestamp: revision.timestamp,
        reason: revision.reason,
        source: 'revision' as const,
        snapshot: cloneSnapshot(revision.after),
      })));
    return states;
  }
  if (measurement.corrections.length) {
    const original = snapshotMeasurement(measurement);
    [...measurement.corrections].reverse().forEach((correction) => { original.values[correction.variableId] = correction.previousValue; });
    const states: MeasurementAuditState[] = [{ id: 'recorded', label: 'Originally recorded', source: 'recorded', snapshot: cloneSnapshot(original) }];
    let current = cloneSnapshot(original);
    measurement.corrections.forEach((correction, index) => {
      current = cloneSnapshot(current);
      current.values[correction.variableId] = correction.replacementValue;
      states.push({ id: correction.id, label: `Legacy correction ${index + 1}`, timestamp: correction.timestamp, reason: correction.reason, source: 'legacy-correction', snapshot: cloneSnapshot(current) });
    });
    return states;
  }
  return [{ id: 'recorded', label: 'Recorded state', timestamp: measurement.recordedAt, source: 'recorded', snapshot: snapshotMeasurement(measurement) }];
}

export function compareMeasurementSnapshots(before: MeasurementSnapshot, after: MeasurementSnapshot): MeasurementSnapshotComparison {
  const variableIds = [...new Set([...Object.keys(before.values), ...Object.keys(after.values)])];
  const values = variableIds.map((variableId) => ({ variableId, before: before.values[variableId], after: after.values[variableId], changed: before.values[variableId] !== after.values[variableId] }));
  const quality = { before: before.quality, after: after.quality, changed: before.quality !== after.quality };
  const notes = { before: before.notes, after: after.notes, changed: before.notes !== after.notes };
  return { values, quality, notes, changedFields: values.filter((item) => item.changed).length + Number(quality.changed) + Number(notes.changed) };
}
