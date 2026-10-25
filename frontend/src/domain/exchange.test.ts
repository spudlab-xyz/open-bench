import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { createExperimentExport, importIntoWorkspace, validateExperimentExchange } from './exchange';

describe('JSON exchange', () => {
  it('round-trips into a separate copy and remaps references', () => {
    const workspace = createSeedWorkspace();
    const source = workspace.experiments[0];
    const envelope = JSON.parse(JSON.stringify(createExperimentExport(source)));
    const imported = importIntoWorkspace(workspace, envelope, 1_800_000_000_000);
    const copy = imported.experiments.at(-1)!;
    expect(copy.id).not.toBe(source.id);
    expect(copy.sourceExperimentId).toBe(source.id);
    expect(copy.specimens[0].conditionId).not.toBe(source.specimens[0].conditionId);
    expect(copy.runs[0].specimenIds[0]).toBe(copy.specimens[0].id);
    expect(copy.measurements[0].runId).toBe(copy.runs[0].id);
    expect(copy.attachments).toEqual(source.attachments);
  });

  it('rejects invalid references before importing anything', () => {
    const source = createSeedWorkspace().experiments[0];
    const envelope = createExperimentExport(source);
    envelope.experiment.measurements[0].specimenId = 'missing';
    expect(() => validateExperimentExchange(envelope)).toThrow(/invalid reference/i);
  });
});
