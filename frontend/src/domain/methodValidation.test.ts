import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { effectiveMethodValidation, identicalMethodRevisionIds, methodAssessmentIsRetrospective, methodProcedureFingerprint, methodValidationIsReady } from './methodValidation';
import { appendVersionHistory, initialiseVersionHistory, planVersionChanges, versionRecordsForEntity } from './versioning';
import { scientificReadinessIssues } from './scientific';

describe('method validation assessments', () => {
  it('covers only explicitly selected procedure-identical revisions', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const first = experiment.methodRevisions[0];
    const identical = { ...structuredClone(first), id: 'method-identical', version: first.version + 1, createdAt: '2026-10-26T12:00:00.000Z' };
    const changed = { ...structuredClone(identical), id: 'method-changed', version: identical.version + 1, steps: [...identical.steps, 'Add a different step.'] };
    experiment.methodRevisions.push(identical, changed);

    expect(identicalMethodRevisionIds(experiment, first.id)).toEqual([first.id, identical.id]);
    expect(methodProcedureFingerprint(first)).toBe(methodProcedureFingerprint(identical));
    expect(methodProcedureFingerprint(first)).not.toBe(methodProcedureFingerprint(changed));

    experiment.methodValidationAssessments = [{
      id: 'assessment-v1',
      methodRevisionIds: [first.id],
      procedureFingerprint: methodProcedureFingerprint(first),
      decision: 'validated',
      reviewer: 'Reviewer',
      assessedAt: '2026-10-26T12:00:00.000Z',
      retrospective: true,
      intendedUse: 'Recorded comparison.',
      limitations: 'Bench conditions only.',
      evidenceIds: [],
      rationale: 'Reference checks support the procedure.',
    }];

    expect(effectiveMethodValidation(experiment, first.id).status).toBe('retrospective-validated');
    expect(methodValidationIsReady(effectiveMethodValidation(experiment, first.id).status)).toBe(true);
    expect(effectiveMethodValidation(experiment, identical.id).status).toBe('unvalidated');
    expect(effectiveMethodValidation(experiment, changed.id).status).toBe('unvalidated');
  });

  it('ignores an assessment when its fingerprint does not match the targeted revision', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const method = experiment.methodRevisions[0];
    experiment.methodValidationAssessments = [{
      id: 'assessment-invalid-fingerprint', methodRevisionIds: [method.id], procedureFingerprint: 'different-procedure', decision: 'validated', reviewer: 'Reviewer', assessedAt: '2026-10-26T12:00:00.000Z', retrospective: false, intendedUse: '', limitations: '', evidenceIds: [], rationale: 'Incorrect linkage.',
    }];
    method.validationStatus = 'unvalidated';
    expect(effectiveMethodValidation(experiment, method.id).status).toBe('unvalidated');
  });

  it('cannot label an assessment prospective when its covered revision was already executed', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const methodId = experiment.runs[0].methodRevisionId;
    expect(methodAssessmentIsRetrospective(experiment, [methodId], '2026-10-26T12:00:00.000Z', false)).toBe(true);
    expect(methodAssessmentIsRetrospective(experiment, [methodId], '2020-10-26T12:00:00.000Z', false)).toBe(false);
    expect(methodAssessmentIsRetrospective(experiment, [methodId], '2020-10-26T12:00:00.000Z', true)).toBe(true);
  });

  it('clears exact-revision readiness through an independently audited retrospective assessment', () => {
    const draft = createSeedWorkspace();
    draft.versionHistory = [];
    const current = initialiseVersionHistory(draft, '2026-10-26T10:00:00.000Z');
    const next = structuredClone(current);
    const experiment = next.experiments[0];
    const method = experiment.methodRevisions.find((item) => item.id === experiment.runs[0].methodRevisionId)!;
    method.validationStatus = 'unvalidated';
    experiment.methodValidationAssessments = [{ id: 'assessment-audited', methodRevisionIds: [method.id], procedureFingerprint: methodProcedureFingerprint(method), decision: 'validated', reviewer: 'Reviewer', assessedAt: '2026-10-26T11:00:00.000Z', retrospective: true, intendedUse: 'Recorded comparison.', limitations: 'Bench conditions only.', evidenceIds: [], rationale: 'Reference checks support retrospective use.' }];
    const changes = planVersionChanges(current, next);
    expect(changes).toEqual(expect.arrayContaining([expect.objectContaining({ entityType: 'method validation assessment', entityId: 'assessment-audited', operation: 'created' })]));
    const versioned = appendVersionHistory(next, changes, '', 'user', '2026-10-26T11:00:00.000Z');
    expect(versionRecordsForEntity(versioned, 'method validation assessment', 'assessment-audited')).toHaveLength(1);
    expect(scientificReadinessIssues(versioned.experiments[0]).some((issue) => /method revision.*lack applicable validation/i.test(issue))).toBe(false);
    expect(versioned.experiments[0].runs[0].methodRevisionId).toBe(method.id);

    const corrected = structuredClone(versioned);
    corrected.experiments[0].methodValidationAssessments![0].rationale = 'Expanded rationale after evidence review.';
    const correctionChanges = planVersionChanges(versioned, corrected);
    expect(correctionChanges).toEqual([expect.objectContaining({ entityType: 'method validation assessment', entityId: 'assessment-audited', operation: 'updated' })]);
    const correctedVersion = appendVersionHistory(corrected, correctionChanges, 'Clarify the assessment rationale.', 'user', '2026-10-26T12:00:00.000Z');
    expect(versionRecordsForEntity(correctedVersion, 'method validation assessment', 'assessment-audited').map((record) => record.version)).toEqual([1, 2]);
  });

  it('distinguishes failed validation in readiness instead of treating it as merely absent', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const method = experiment.methodRevisions.find((item) => item.id === experiment.runs[0].methodRevisionId)!;
    method.validationStatus = 'unvalidated';
    experiment.methodValidationAssessments = [{ id: 'assessment-failed', methodRevisionIds: [method.id], procedureFingerprint: methodProcedureFingerprint(method), decision: 'failed', reviewer: 'Reviewer', assessedAt: '2026-10-26T11:00:00.000Z', retrospective: true, intendedUse: '', limitations: 'Reference comparison failed.', evidenceIds: [], rationale: 'Observed bias exceeded the acceptable range.' }];
    expect(scientificReadinessIssues(experiment)).toContain('1 method revision used by this experiment lacks applicable validation (1 failed).');
  });
});
