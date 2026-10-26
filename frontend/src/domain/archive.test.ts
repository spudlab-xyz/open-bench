import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { createWorkspaceArchive, validateWorkspaceArchive, workspaceIntegrityIssues } from './archive';
import { methodProcedureFingerprint } from './methodValidation';

describe('complete browser archive', () => {
  it('includes the workspace ledger and validates its manifest', async () => {
    const workspace = createSeedWorkspace();
    const archive = await createWorkspaceArchive(workspace, async () => null);
    expect(archive.workspace.versionHistory).toHaveLength(workspace.versionHistory.length);
    expect(archive.manifest.omissions).toEqual([]);
    await expect(validateWorkspaceArchive(archive)).resolves.toMatchObject({ format: 'openbench-browser-archive' });
  });

  it('reports broken scientific references', () => {
    const workspace = createSeedWorkspace();
    workspace.experiments[0].measurements[0].runId = 'missing-run';
    expect(workspaceIntegrityIssues(workspace)).toEqual(expect.arrayContaining([expect.stringMatching(/invalid scientific-context/i)]));
  });

  it('reports validation coverage whose fingerprint does not match every target', () => {
    const workspace = createSeedWorkspace();
    const experiment = workspace.experiments[0];
    const method = experiment.methodRevisions[0];
    const changed = { ...structuredClone(method), id: 'different-method', version: method.version + 1, steps: [...method.steps, 'Different step'] };
    experiment.methodRevisions.push(changed);
    experiment.methodValidationAssessments = [{ id: 'invalid-coverage', methodRevisionIds: [method.id, changed.id], procedureFingerprint: methodProcedureFingerprint(method), decision: 'validated', reviewer: 'Reviewer', assessedAt: '2026-10-26T12:00:00.000Z', retrospective: true, intendedUse: 'Bench use.', limitations: 'Bench only.', evidenceIds: [], rationale: 'Invalid broad coverage.' }];

    expect(workspaceIntegrityIssues(workspace)).toContain('invalid-coverage has a procedure fingerprint that does not match every targeted method revision.');
  });

  it('round-trips attachment bytes with a verified SHA-256 hash', async () => {
    const workspace = createSeedWorkspace();
    workspace.experiments[0].attachments.push({ id: 'attachment-test', name: 'evidence.txt', type: 'text/plain', size: 8, caption: 'Evidence', createdAt: '2026-10-26T12:00:00.000Z' });
    const archive = await createWorkspaceArchive(workspace, async (id) => id === 'attachment-test' ? { id, experimentId: workspace.experiments[0].id, blob: new Blob(['evidence'], { type: 'text/plain' }) } : null);
    expect(archive.attachments[0]).toMatchObject({ id: 'attachment-test', size: 8 });
    await expect(validateWorkspaceArchive(archive)).resolves.toBe(archive);
  });

  it('upgrades a schema-v3 archive without broadening legacy validation coverage', async () => {
    const workspace = createSeedWorkspace();
    const method = workspace.experiments[0].methodRevisions[0];
    method.validationStatus = 'validated';
    workspace.experiments[0].methodValidationAssessments = [];
    const archive = await createWorkspaceArchive(workspace, async () => null);
    (archive.workspace as unknown as { schemaVersion: number }).schemaVersion = 3;
    const validated = await validateWorkspaceArchive(archive);
    expect(validated.workspace.schemaVersion).toBe(4);
    expect(validated.workspace.experiments[0].methodValidationAssessments?.[0]).toMatchObject({ methodRevisionIds: [method.id], decision: 'validated' });
  });
});
