import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { analysisIsStale, conclusionIsStale, scientificReadinessIssues, scientificReviewTargetId, scientificReviewTargetOptions, stableChecksum, upgradeScientificWorkspace } from './scientific';
import { appendVersionHistory, initialiseVersionHistory, planVersionChanges, versionRecordsForEntity } from './versioning';

describe('scientific record concepts', () => {
  it('upgrades legacy records without inventing a known acquisition source', () => {
    const current = createSeedWorkspace();
    const legacy = structuredClone(current) as unknown as Parameters<typeof upgradeScientificWorkspace>[0];
    legacy.schemaVersion = 2;
    delete legacy.experiments[0].measurements[0].context;
    delete legacy.experiments[0].methodRevisions[0].validationStatus;
    const upgraded = upgradeScientificWorkspace(legacy);
    expect(upgraded.schemaVersion).toBe(4);
    expect(upgraded.experiments[0].measurements[0].context?.acquisitionMethod).toBe('legacy-unknown');
    expect(upgraded.experiments[0].methodRevisions[0].validationStatus).toBe('unvalidated');
    expect(planVersionChanges(legacy as never, upgraded)).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'method', operation: 'updated' }),
      expect.objectContaining({ entityType: 'measurement', operation: 'updated' }),
    ]));
  });

  it('migrates legacy validation only to the exact method revision', () => {
    const legacy = structuredClone(createSeedWorkspace()) as unknown as Parameters<typeof upgradeScientificWorkspace>[0];
    legacy.schemaVersion = 3;
    const experiment = legacy.experiments[0];
    const validated = experiment.methodRevisions[0];
    validated.validationStatus = 'validated';
    validated.intendedUse = 'Bench comparison.';
    validated.useLimitations = 'Recorded conditions only.';
    const identical = { ...structuredClone(validated), id: 'legacy-identical-method', version: validated.version + 1 };
    experiment.methodRevisions.push(identical);
    identical.validationStatus = 'unvalidated';

    const upgraded = upgradeScientificWorkspace(legacy);
    const assessment = upgraded.experiments[0].methodValidationAssessments?.[0];
    expect(assessment).toMatchObject({ methodRevisionIds: [validated.id], decision: 'validated', retrospective: true });
    expect(assessment?.methodRevisionIds).not.toContain(identical.id);
  });

  it('detects stale analyses and conclusions independently', () => {
    const experiment = createSeedWorkspace().experiments[0];
    expect(analysisIsStale(experiment, experiment.analyses[0])).toBe(false);
    experiment.dataRevision += 1;
    expect(analysisIsStale(experiment, experiment.analyses[0])).toBe(true);
    expect(conclusionIsStale(experiment)).toBe(true);
  });

  it('offers labelled review targets and rejects unknown explicit targets', () => {
    const experiment = createSeedWorkspace().experiments[0];
    const method = experiment.methodRevisions[0];
    const analysis = experiment.analyses[0];
    expect(scientificReviewTargetOptions(experiment, 'method')).toContainEqual({
      id: method.id,
      label: `Method v${method.version} — ${method.title}`,
    });
    expect(scientificReviewTargetOptions(experiment, 'analysis')).toContainEqual(expect.objectContaining({
      id: analysis.id,
      label: expect.stringContaining(analysis.name),
    }));
    expect(scientificReviewTargetId(experiment, 'method', method.id)).toBe(method.id);
    expect(scientificReviewTargetId(experiment, 'analysis', 'unknown-analysis')).toBeNull();
    expect(scientificReviewTargetId(experiment, 'report', '')).toBe(experiment.id);
    expect(scientificReviewTargetId(experiment, 'conclusion', '')).toBe(experiment.id);
  });

  it('marks a conclusion stale when execution method evidence changes', () => {
    const experiment = createSeedWorkspace().experiments[0];
    expect(conclusionIsStale(experiment)).toBe(false);
    experiment.runs[0].methodRevisionId = 'different-method-revision';
    expect(conclusionIsStale(experiment)).toBe(true);
  });

  it('reports readiness gaps and creates deterministic checksums', () => {
    const experiment = createSeedWorkspace().experiments[0];
    expect(scientificReadinessIssues(experiment)).toEqual(expect.arrayContaining([
      expect.stringMatching(/source|provenance/i),
      expect.stringMatching(/method/i),
    ]));
    expect(stableChecksum({ a: 1, b: 2 })).toBe(stableChecksum({ a: 1, b: 2 }));
  });

  it('audits stable-ID scientific-record corrections and clears corrected readiness issues', () => {
    const draft = createSeedWorkspace();
    const experiment = draft.experiments[0];
    experiment.sources = [{ id: 'source-editable', name: 'Bench log', kind: 'manual', permissionStatus: 'not-reviewed' }];
    experiment.instruments = [{ id: 'instrument-editable', name: 'Probe', sensorType: 'Temperature probe' }];
    experiment.calibrations = [{ id: 'calibration-editable', instrumentId: 'instrument-editable', calibratedAt: '2026-10-01T09:00:00.000Z', procedure: 'Reference comparison', result: 'unknown', evidenceAttachmentIds: [] }];
    experiment.validationEvidence = [{ id: 'evidence-editable', title: 'Reference comparison', kind: 'tool-comparison', summary: 'Pending comparison.', result: 'not-reviewed', conditions: '', limitations: '', recordedAt: '2026-10-01T09:00:00.000Z', attachmentIds: [] }];
    experiment.scientificReviews = [{ id: 'review-editable', scope: 'report', targetId: experiment.id, reviewer: 'Reviewer', decision: 'pending', comments: 'Review pending.', reviewedAt: '2026-10-01T09:00:00.000Z', dataRevision: experiment.dataRevision }];
    draft.versionHistory = [];
    const current = initialiseVersionHistory(draft, '2026-10-01T09:00:00.000Z');
    expect(scientificReadinessIssues(current.experiments[0])).toContain('One or more observation sources lack usable permission review.');

    const corrected = structuredClone(current);
    const correctedExperiment = corrected.experiments[0];
    correctedExperiment.sources![0].permissionStatus = 'permitted';
    correctedExperiment.instruments![0].name = 'Calibrated probe';
    correctedExperiment.calibrations![0].result = 'passed';
    correctedExperiment.validationEvidence![0].result = 'supports-use';
    correctedExperiment.scientificReviews![0].decision = 'approved';

    const changes = planVersionChanges(current, corrected);
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'data source', entityId: 'source-editable', operation: 'updated' }),
      expect.objectContaining({ entityType: 'instrument', entityId: 'instrument-editable', operation: 'updated' }),
      expect.objectContaining({ entityType: 'calibration', entityId: 'calibration-editable', operation: 'updated' }),
      expect.objectContaining({ entityType: 'validation evidence', entityId: 'evidence-editable', operation: 'updated' }),
      expect.objectContaining({ entityType: 'scientific review', entityId: 'review-editable', operation: 'updated' }),
    ]));
    expect(changes).toHaveLength(5);

    const versioned = appendVersionHistory(corrected, changes, 'Correct readiness records.', 'user', '2026-10-02T09:00:00.000Z');
    expect(versioned.experiments[0].sources).toHaveLength(1);
    expect(versioned.experiments[0].sources![0].id).toBe('source-editable');
    expect(versionRecordsForEntity(versioned, 'data source', 'source-editable').map((record) => record.version)).toEqual([1, 2]);
    expect(scientificReadinessIssues(versioned.experiments[0])).not.toContain('One or more observation sources lack usable permission review.');
  });
});
