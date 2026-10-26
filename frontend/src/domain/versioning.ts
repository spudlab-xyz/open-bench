import type { VersionOperation, VersionRecord, VersionSource, Workspace } from '../types';

interface VersionedEntity {
  entityType: string;
  entityId: string;
  entityLabel: string;
  snapshot: unknown;
}

export interface PlannedVersionChange extends VersionedEntity {
  operation: VersionOperation;
}

const keyOf = (entity: Pick<VersionedEntity, 'entityType' | 'entityId'>) => `${entity.entityType}:${entity.entityId}`;
const without = <T extends object>(value: T, keys: string[]): Record<string, unknown> => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
export const analysisVersionEntityId = (experimentId: string, analysisName: string) => `${experimentId}:${analysisName.trim().toLowerCase()}`;

export function collectVersionedEntities(workspace: Workspace): Map<string, VersionedEntity> {
  const entities = new Map<string, VersionedEntity>();
  const add = (entityType: string, entityId: string, entityLabel: string, snapshot: unknown) => {
    const entity = { entityType, entityId, entityLabel, snapshot: structuredClone(snapshot) };
    entities.set(keyOf(entity), entity);
  };

  workspace.projects.forEach((project) => {
    add('project', project.id, project.name, without(project, ['lifecycleEvents', 'updatedAt']));
    project.lifecycleEvents.forEach((event) => add('project lifecycle event', event.id, `${project.name}: ${event.status}`, event));
  });

  workspace.experiments.forEach((experiment) => {
    add('experiment', experiment.id, experiment.title, without(experiment, ['conditions', 'variables', 'methodRevisions', 'specimens', 'runs', 'measurements', 'analyses', 'notes', 'attachments', 'conclusion', 'limitations', 'followUp', 'updatedAt', 'sources', 'instruments', 'calibrations', 'imports', 'missingObservations', 'validationEvidence', 'methodValidationAssessments', 'scientificReviews', 'conclusionEvidence', 'reportReleases']));
    add('conclusion', experiment.id, `${experiment.title}: conclusion`, {
      conclusion: experiment.conclusion,
      limitations: experiment.limitations,
      followUp: experiment.followUp,
    });
    experiment.conditions.forEach((condition) => add('condition', condition.id, `${experiment.title}: ${condition.name}`, condition));
    experiment.variables.forEach((variable) => add('variable', variable.id, `${experiment.title}: ${variable.name}`, variable));
    const currentMethod = experiment.methodRevisions.at(-1);
    if (currentMethod) add('method', experiment.id, `${experiment.title}: method`, currentMethod);
    experiment.specimens.forEach((specimen) => add('specimen', specimen.id, `${experiment.title}: ${specimen.name}`, specimen));
    experiment.runs.forEach((run) => add('run', run.id, `${experiment.title}: ${run.name}`, run));
    experiment.measurements.forEach((measurement) => {
      add('measurement', measurement.id, `${experiment.title}: measurement ${measurement.id}`, without(measurement, ['corrections', 'revisions']));
      measurement.corrections.forEach((correction) => add('measurement correction', correction.id, `${experiment.title}: correction ${correction.id}`, correction));
      measurement.revisions?.forEach((revision) => add('measurement revision', revision.id, `${experiment.title}: measurement revision ${revision.revision}`, revision));
    });
    const analysesByName = new Map<string, typeof experiment.analyses>();
    experiment.analyses.forEach((analysis) => {
      const key = analysis.name.trim().toLowerCase();
      analysesByName.set(key, [...(analysesByName.get(key) ?? []), analysis]);
    });
    analysesByName.forEach((analyses, nameKey) => {
      const analysis = [...analyses].sort((left, right) => left.revision - right.revision).at(-1)!;
      const analysisId = analysisVersionEntityId(experiment.id, nameKey);
      add('analysis', analysisId, `${experiment.title}: ${analysis.name}`, without(analysis, ['exclusions']));
      analysis.exclusions.forEach((exclusion) => add('analysis exclusion', `${analysisId}:${exclusion.measurementId}`, `${analysis.name}: exclusion ${exclusion.measurementId}`, exclusion));
    });
    experiment.notes.forEach((note) => add('note', note.id, `${experiment.title}: note`, note));
    experiment.attachments.forEach((attachment) => add('attachment', attachment.id, `${experiment.title}: ${attachment.caption || attachment.name}`, attachment));
    experiment.sources?.forEach((source) => add('data source', source.id, `${experiment.title}: ${source.name}`, source));
    experiment.instruments?.forEach((instrument) => add('instrument', instrument.id, `${experiment.title}: ${instrument.name}`, instrument));
    experiment.calibrations?.forEach((calibration) => add('calibration', calibration.id, `${experiment.title}: calibration ${calibration.instrumentId}`, calibration));
    experiment.imports?.forEach((record) => add('data import', record.id, `${experiment.title}: ${record.filename}`, record));
    experiment.missingObservations?.forEach((observation) => add('missing observation', observation.id, `${experiment.title}: missing ${observation.variableId}`, observation));
    experiment.validationEvidence?.forEach((evidence) => add('validation evidence', evidence.id, `${experiment.title}: ${evidence.title}`, evidence));
    experiment.methodValidationAssessments?.forEach((assessment) => add('method validation assessment', assessment.id, `${experiment.title}: method validation`, assessment));
    experiment.scientificReviews?.forEach((review) => add('scientific review', review.id, `${experiment.title}: ${review.scope} review`, review));
    if (experiment.conclusionEvidence) add('conclusion evidence', experiment.id, `${experiment.title}: conclusion evidence`, experiment.conclusionEvidence);
    experiment.reportReleases?.forEach((release) => add('report release', release.id, `${experiment.title}: report ${release.status}`, release));
  });

  workspace.savedMethods.forEach((method) => add('saved method', method.id, method.title, method));
  return entities;
}

export function planVersionChanges(current: Workspace, next: Workspace): PlannedVersionChange[] {
  const before = collectVersionedEntities(current);
  const after = collectVersionedEntities(next);
  const changes: PlannedVersionChange[] = [];

  after.forEach((entity, key) => {
    const prior = before.get(key);
    if (!prior) changes.push({ ...entity, operation: 'created' });
    else if (JSON.stringify(prior.snapshot) !== JSON.stringify(entity.snapshot)) changes.push({ ...entity, operation: 'updated' });
  });
  before.forEach((entity, key) => {
    if (!after.has(key)) changes.push({ ...entity, operation: 'deleted' });
  });
  return changes;
}

export function changeRequiresReason(workspace: Workspace, change: PlannedVersionChange): boolean {
  return change.operation !== 'created' || workspace.versionHistory.some((record) => record.entityType === change.entityType && record.entityId === change.entityId);
}

export function versionRecordsForEntity(workspace: Workspace, entityType: string, entityId: string): VersionRecord[] {
  return workspace.versionHistory
    .filter((record) => record.entityType === entityType && record.entityId === entityId)
    .sort((left, right) => left.version - right.version);
}

export function isInitialVersionRecord(record: VersionRecord): boolean {
  return record.version === 1 && record.operation === 'created';
}

export function appendVersionHistory(workspace: Workspace, changes: PlannedVersionChange[], reason: string, source: VersionSource, timestamp: string): Workspace {
  if (!changes.length) return workspace;
  const history = [...workspace.versionHistory];
  changes.forEach((change) => {
    const previousVersion = history.filter((record) => record.entityType === change.entityType && record.entityId === change.entityId).reduce((highest, record) => Math.max(highest, record.version), 0);
    const resolvedReason = change.operation === 'created' && previousVersion === 0 ? 'Initial version' : reason.trim();
    if (!resolvedReason) throw new Error(`A reason is required to create version ${previousVersion + 1} of ${change.entityType} ${change.entityId}.`);
    history.push({
      id: `version-${crypto.randomUUID()}`,
      ...change,
      version: previousVersion + 1,
      reason: resolvedReason,
      timestamp,
      source,
    });
  });
  return { ...workspace, versionHistory: history };
}

export function initialiseVersionHistory(workspace: Omit<Workspace, 'versionHistory'> & { versionHistory?: VersionRecord[] }, timestamp = new Date().toISOString()): Workspace {
  const normalized = { ...workspace, schemaVersion: 4 as const, versionHistory: workspace.versionHistory ?? [] } as Workspace;
  if (normalized.versionHistory.length) return normalized;
  const empty = { ...normalized, projects: [], experiments: [], savedMethods: [] };
  const changes = planVersionChanges(empty, normalized);
  return appendVersionHistory(normalized, changes, 'Initial version', 'system', timestamp);
}
