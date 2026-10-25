import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { buildMeasurementAuditStates, compareMeasurementSnapshots, correctMeasurement, reviseMeasurement, snapshotMeasurement } from './measurements';

describe('measurement corrections', () => {
  it('preserves the original value with reason and timestamp', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const measurement = experiment.measurements[0];
    const original = measurement.values.waterTemperature as number;
    const corrected = correctMeasurement(experiment, measurement.id, 'waterTemperature', original - 0.5, 'Checked paper log.', '2026-10-25T12:00:00.000Z');
    const result = corrected.measurements[0];
    expect(result.values.waterTemperature).toBe(original - 0.5);
    expect(result.corrections.at(-1)).toMatchObject({ previousValue: original, replacementValue: original - 0.5, reason: 'Checked paper log.' });
    expect(result.revisions?.at(-1)).toMatchObject({ revision: 1, reason: 'Checked paper log.', before: { quality: 'valid' }, after: { quality: 'valid' } });
    expect(experiment.measurements[0].values.waterTemperature).toBe(original);
  });

  it('captures value, quality and notes in one atomic revision', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const measurement = experiment.measurements[0];
    const desired = snapshotMeasurement(measurement);
    desired.values.waterTemperature = (desired.values.waterTemperature as number) - 1;
    desired.quality = 'review';
    desired.notes = 'Probe position needs confirmation.';
    const revised = reviseMeasurement(experiment, measurement.id, desired, 'Paper log and setup photograph disagree.', '2026-10-25T13:00:00.000Z');
    const result = revised.measurements[0];
    expect(revised.dataRevision).toBe(experiment.dataRevision + 1);
    expect(result.revisions).toHaveLength(1);
    expect(result.revisions?.[0].before.notes).toBe(measurement.notes);
    expect(result.revisions?.[0].after).toMatchObject({ quality: 'review', notes: 'Probe position needs confirmation.' });
    expect(result.corrections.at(-1)?.previousValue).toBe(measurement.values.waterTemperature);
  });

  it('requires a reason and rejects no-op revisions', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const measurement = experiment.measurements[0];
    expect(() => reviseMeasurement(experiment, measurement.id, snapshotMeasurement(measurement), '')).toThrow(/note is required/i);
    expect(() => reviseMeasurement(experiment, measurement.id, snapshotMeasurement(measurement), 'No change.')).toThrow(/change a value/i);
  });

  it('reconstructs legacy correction states and compares effective snapshots', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const measurement = experiment.measurements.find((item) => item.corrections.length)!;
    const states = buildMeasurementAuditStates(measurement);
    expect(states).toHaveLength(2);
    const comparison = compareMeasurementSnapshots(states[0].snapshot, states[1].snapshot);
    expect(comparison.values.find((item) => item.variableId === 'waterTemperature')?.changed).toBe(true);
    expect(comparison.changedFields).toBe(1);
  });

  it('keeps legacy corrections comparable after tracked revisions begin', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const measurement = experiment.measurements.find((item) => item.corrections.length)!;
    const desired = snapshotMeasurement(measurement);
    desired.notes = 'Reviewed after the legacy correction.';
    const revised = reviseMeasurement(experiment, measurement.id, desired, 'Document review completion.', '2026-10-25T14:00:00.000Z');
    const states = buildMeasurementAuditStates(revised.measurements.find((item) => item.id === measurement.id)!);
    expect(states.map((state) => state.source)).toEqual(['recorded', 'legacy-correction', 'revision']);
    expect(states[1].reason).toBe(measurement.corrections[0].reason);
  });
});
