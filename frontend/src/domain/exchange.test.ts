import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { createExperimentExport, importIntoWorkspace, validateExperimentExchange } from './exchange';
import { methodProcedureFingerprint } from './methodValidation';

describe('JSON exchange', () => {
  it('round-trips into a separate copy and remaps references', () => {
    const workspace = createSeedWorkspace();
    const source = workspace.experiments[0];
    const method = source.methodRevisions[0];
    source.methodValidationAssessments = [{ id: 'assessment-export', methodRevisionIds: [method.id], procedureFingerprint: methodProcedureFingerprint(method), decision: 'validated', reviewer: 'Reviewer', assessedAt: '2026-10-26T12:00:00.000Z', retrospective: true, intendedUse: 'Bench comparison.', limitations: 'Bench only.', evidenceIds: [], rationale: 'Supported by reference checks.' }];
    const envelope = JSON.parse(JSON.stringify(createExperimentExport(source)));
    const imported = importIntoWorkspace(workspace, envelope, 1_800_000_000_000);
    const copy = imported.experiments.at(-1)!;
    expect(copy.id).not.toBe(source.id);
    expect(copy.sourceExperimentId).toBe(source.id);
    expect(copy.specimens[0].conditionId).not.toBe(source.specimens[0].conditionId);
    expect(copy.runs[0].specimenIds[0]).toBe(copy.specimens[0].id);
    expect(copy.measurements[0].runId).toBe(copy.runs[0].id);
    expect(copy.attachments).toEqual(source.attachments);
    expect(copy.methodValidationAssessments?.[0].id).not.toBe('assessment-export');
    expect(copy.methodValidationAssessments?.[0].methodRevisionIds).toEqual([copy.methodRevisions[0].id]);
  });

  it('rejects invalid references before importing anything', () => {
    const source = createSeedWorkspace().experiments[0];
    const envelope = createExperimentExport(source);
    envelope.experiment.measurements[0].specimenId = 'missing';
    expect(() => validateExperimentExchange(envelope)).toThrow(/invalid reference/i);
  });

  it('rejects validation coverage across materially different procedures', () => {
    const source = createSeedWorkspace().experiments[0];
    const method = source.methodRevisions[0];
    const changed = { ...structuredClone(method), id: 'different-method', version: method.version + 1, equipment: `${method.equipment} and a different fixture` };
    source.methodRevisions.push(changed);
    source.methodValidationAssessments = [{ id: 'invalid-coverage', methodRevisionIds: [method.id, changed.id], procedureFingerprint: methodProcedureFingerprint(method), decision: 'validated', reviewer: 'Reviewer', assessedAt: '2026-10-26T12:00:00.000Z', retrospective: true, intendedUse: 'Bench use.', limitations: 'Bench only.', evidenceIds: [], rationale: 'Invalid broad coverage.' }];

    expect(() => validateExperimentExchange(createExperimentExport(source))).toThrow(/fingerprint.*does not match every targeted method revision/i);
  });

  it('rejects variables whose unit is not explicit', () => {
    const envelope = createExperimentExport(createSeedWorkspace().experiments[0]);
    envelope.experiment.variables[0].unit = '';

    expect(() => validateExperimentExchange(envelope)).toThrow(/has no unit/i);
  });

  it('rejects date-times without an explicit time zone offset', () => {
    const envelope = createExperimentExport(createSeedWorkspace().experiments[0]);
    envelope.experiment.updatedAt = '2026-10-25T12:00:00';

    expect(() => validateExperimentExchange(envelope)).toThrow(/explicit UTC offset or Z suffix/i);
  });
});
