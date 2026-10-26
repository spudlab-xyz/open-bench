import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { validateRun } from './runs';
import { appendVersionHistory, planVersionChanges, versionRecordsForEntity } from './versioning';

describe('run validation', () => {
  it('accepts a safe deviations edit', () => {
    const experiment = createSeedWorkspace().experiments.find((item) => item.runs.length > 0)!;
    const run = structuredClone(experiment.runs[0]);
    run.deviations = 'Probe placement was corrected before the first reading.';

    expect(validateRun(experiment, run)).toEqual([]);
  });

  it('prevents disassociating a specimen with measurements in the run', () => {
    const experiment = createSeedWorkspace().experiments.find((item) => item.measurements.length > 0)!;
    const measurement = experiment.measurements[0];
    const run = structuredClone(experiment.runs.find((item) => item.id === measurement.runId)!);
    run.specimenIds = run.specimenIds.filter((id) => id !== measurement.specimenId);

    expect(validateRun(experiment, run)).toContain('Keep every specimen that already has measurements in this run.');
  });

  it('prevents relinking an evidence-bearing run to a later method revision', () => {
    const experiment = createSeedWorkspace().experiments.find((item) => item.measurements.length > 0)!;
    const measurement = experiment.measurements[0];
    const original = experiment.runs.find((item) => item.id === measurement.runId)!;
    const laterMethod = { ...structuredClone(experiment.methodRevisions[0]), id: 'later-method', version: 2 };
    experiment.methodRevisions.push(laterMethod);
    const changed = { ...structuredClone(original), methodRevisionId: laterMethod.id };

    expect(validateRun(experiment, changed, original)).toContain('The method revision cannot change after measurements exist; historical runs must retain the procedure actually used.');
  });

  it('requires coherent completion state and timestamps', () => {
    const experiment = createSeedWorkspace().experiments.find((item) => item.runs.length > 0)!;
    const run = structuredClone(experiment.runs[0]);
    run.status = 'complete';
    run.startedAt = '2026-10-26T12:00:00.000Z';
    run.completedAt = '2026-10-26T11:00:00.000Z';
    expect(validateRun(experiment, run)).toContain('Completion cannot be earlier than the run start.');

    run.status = 'running';
    expect(validateRun(experiment, run)).toContain('Only completed runs can retain a completion date and time.');
  });

  it('creates the next universal version when deviations are edited', () => {
    const current = createSeedWorkspace();
    const next = structuredClone(current);
    const experiment = next.experiments.find((item) => item.runs.length > 0)!;
    const run = experiment.runs[0];
    run.deviations = 'Documented after reviewing the execution notes.';
    experiment.updatedAt = '2026-10-26T12:00:00.000Z';
    const changes = planVersionChanges(current, next);

    expect(changes).toEqual([expect.objectContaining({ entityType: 'run', entityId: run.id, operation: 'updated' })]);
    const versioned = appendVersionHistory(next, changes, 'Record the observed execution deviation.', 'user', '2026-10-26T12:00:00.000Z');
    expect(versionRecordsForEntity(versioned, 'run', run.id).at(-1)).toMatchObject({ version: 2, reason: 'Record the observed execution deviation.' });
  });
});
