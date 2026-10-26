import type { AttachmentRecord, Workspace } from '../types';
import { methodAssessmentTargetsMatch } from './methodValidation';
import { APPLICATION_VERSION, upgradeScientificWorkspace } from './scientific';
import { appendVersionHistory, planVersionChanges } from './versioning';

export const ARCHIVE_FORMAT = 'openbench-browser-archive';
export const ARCHIVE_VERSION = 1;

export interface ArchivedAttachment {
  id: string;
  experimentId: string;
  type: string;
  size: number;
  sha256: string;
  base64: string;
}

export interface WorkspaceArchive {
  format: typeof ARCHIVE_FORMAT;
  version: typeof ARCHIVE_VERSION;
  createdAt: string;
  applicationVersion: string;
  manifest: {
    workspaceSchemaVersion: number;
    experiments: number;
    versionRecords: number;
    attachmentsExpected: number;
    attachmentsIncluded: number;
    omissions: string[];
    integrityIssues: string[];
  };
  workspace: Workspace;
  attachments: ArchivedAttachment[];
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return `sha256-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function workspaceIntegrityIssues(workspace: Workspace): string[] {
  const issues: string[] = [];
  const entityKeys = new Set<string>();
  const register = (type: string, id: string) => {
    const key = `${type}:${id}`;
    if (!id) issues.push(`${type} has an empty identifier.`);
    if (entityKeys.has(key)) issues.push(`Duplicate ${type} identifier ${id}.`);
    entityKeys.add(key);
  };
  workspace.projects.forEach((project) => register('project', project.id));
  workspace.experiments.forEach((experiment) => {
    register('experiment', experiment.id);
    if (!workspace.projects.some((project) => project.id === experiment.projectId)) issues.push(`${experiment.code} references missing project ${experiment.projectId}.`);
    const conditions = new Set(experiment.conditions.map((item) => item.id));
    const specimens = new Set(experiment.specimens.map((item) => item.id));
    const runs = new Set(experiment.runs.map((item) => item.id));
    const methods = new Set(experiment.methodRevisions.map((item) => item.id));
    const instruments = new Set((experiment.instruments ?? []).map((item) => item.id));
    experiment.specimens.forEach((item) => { register('specimen', item.id); if (!conditions.has(item.conditionId)) issues.push(`${item.id} references missing condition.`); });
    experiment.runs.forEach((item) => { register('run', item.id); if (!methods.has(item.methodRevisionId)) issues.push(`${item.id} references missing method revision.`); item.specimenIds.forEach((id) => { if (!specimens.has(id)) issues.push(`${item.id} references missing specimen ${id}.`); }); });
    experiment.measurements.forEach((item) => { register('measurement', item.id); if (!specimens.has(item.specimenId) || !runs.has(item.runId) || !conditions.has(item.conditionId)) issues.push(`${item.id} has an invalid scientific-context reference.`); if (item.context?.instrumentId && !instruments.has(item.context.instrumentId)) issues.push(`${item.id} references missing instrument ${item.context.instrumentId}.`); });
    experiment.calibrations?.forEach((item) => { if (!instruments.has(item.instrumentId)) issues.push(`${item.id} references missing instrument ${item.instrumentId}.`); });
    experiment.missingObservations?.forEach((item) => { if (!specimens.has(item.specimenId) || !runs.has(item.runId)) issues.push(`${item.id} has an invalid missing-observation reference.`); });
    experiment.methodValidationAssessments?.forEach((item) => {
      register('method validation assessment', item.id);
      if (!item.methodRevisionIds.length || item.methodRevisionIds.some((id) => !methods.has(id))) issues.push(`${item.id} references a missing method revision.`);
      else if (!methodAssessmentTargetsMatch(experiment, item)) issues.push(`${item.id} has a procedure fingerprint that does not match every targeted method revision.`);
      if (item.evidenceIds.some((id) => !experiment.validationEvidence?.some((evidence) => evidence.id === id))) issues.push(`${item.id} references missing validation evidence.`);
    });
  });
  return issues;
}

export async function createWorkspaceArchive(workspace: Workspace, loadAttachment: (id: string) => Promise<AttachmentRecord | null>): Promise<WorkspaceArchive> {
  const expected = workspace.experiments.flatMap((experiment) => experiment.attachments.map((attachment) => ({ experimentId: experiment.id, attachment })));
  const attachments: ArchivedAttachment[] = [];
  const omissions: string[] = [];
  for (const { experimentId, attachment } of expected) {
    const record = await loadAttachment(attachment.id);
    if (!record) { omissions.push(`Attachment bytes unavailable: ${attachment.id}`); continue; }
    const bytes = new Uint8Array(await record.blob.arrayBuffer());
    attachments.push({ id: record.id, experimentId, type: record.blob.type || attachment.type, size: bytes.byteLength, sha256: await sha256(bytes), base64: encodeBase64(bytes) });
  }
  return {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    createdAt: new Date().toISOString(),
    applicationVersion: APPLICATION_VERSION,
    manifest: { workspaceSchemaVersion: workspace.schemaVersion, experiments: workspace.experiments.length, versionRecords: workspace.versionHistory.length, attachmentsExpected: expected.length, attachmentsIncluded: attachments.length, omissions, integrityIssues: workspaceIntegrityIssues(workspace) },
    workspace: structuredClone(workspace),
    attachments,
  };
}

export async function validateWorkspaceArchive(input: unknown): Promise<WorkspaceArchive> {
  if (!input || typeof input !== 'object') throw new Error('Archive is not a JSON object.');
  const archive = input as WorkspaceArchive;
  if (archive.format !== ARCHIVE_FORMAT || archive.version !== ARCHIVE_VERSION) throw new Error('Unsupported OpenBench browser archive format.');
  const workspaceSchemaVersion = (archive.workspace as unknown as { schemaVersion?: number } | undefined)?.schemaVersion;
  if (!archive.workspace || !workspaceSchemaVersion || ![3, 4].includes(workspaceSchemaVersion)) throw new Error('Archive does not contain a supported schema-v3 or schema-v4 workspace.');
  if (workspaceSchemaVersion === 3) {
    const legacy = archive.workspace as unknown as Parameters<typeof upgradeScientificWorkspace>[0];
    const upgraded = upgradeScientificWorkspace(legacy);
    archive.workspace = appendVersionHistory(upgraded, planVersionChanges(legacy as unknown as Workspace, upgraded), 'Browser archive migrated to schema v4 with independent method-validation assessments.', 'system', new Date().toISOString());
    archive.manifest.workspaceSchemaVersion = 4;
    archive.manifest.versionRecords = archive.workspace.versionHistory.length;
  }
  const issues = workspaceIntegrityIssues(archive.workspace);
  if (issues.length) throw new Error(`Archive workspace integrity failed: ${issues.join(' ')}`);
  for (const attachment of archive.attachments ?? []) {
    const bytes = decodeBase64(attachment.base64);
    if (bytes.byteLength !== attachment.size || await sha256(bytes) !== attachment.sha256) throw new Error(`Attachment integrity failed for ${attachment.id}.`);
  }
  return archive;
}

export function attachmentRecordFromArchive(attachment: ArchivedAttachment): AttachmentRecord {
  return { id: attachment.id, experimentId: attachment.experimentId, blob: new Blob([decodeBase64(attachment.base64).buffer as ArrayBuffer], { type: attachment.type }) };
}
