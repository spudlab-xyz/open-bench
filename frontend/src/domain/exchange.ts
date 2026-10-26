import type { Experiment, Workspace } from '../types';
import { methodAssessmentTargetsMatch, methodProcedureFingerprint } from './methodValidation';

export const EXCHANGE_FORMAT = 'openbench-experiment';
export const EXCHANGE_VERSION = 3;

export interface ExperimentExchange {
  format: typeof EXCHANGE_FORMAT;
  version: number;
  exportedAt: string;
  attachments: { included: false; note: string };
  experiment: Experiment;
}

export function createExperimentExport(experiment: Experiment): ExperimentExchange {
  return {
    format: EXCHANGE_FORMAT,
    version: EXCHANGE_VERSION,
    exportedAt: new Date().toISOString(),
    attachments: { included: false, note: 'Attachment metadata is included in the experiment. Attachment bytes are not included in this plain JSON export.' },
    experiment: structuredClone(experiment),
  };
}

function requireUnique(ids: string[], label: string, issues: string[]): void {
  if (new Set(ids).size !== ids.length) issues.push(`${label} contains duplicate identifiers.`);
  if (ids.some((id) => !id || typeof id !== 'string')) issues.push(`${label} contains an invalid identifier.`);
}

function requireExplicitTimestamp(value: unknown, label: string, issues: string[]): void {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    issues.push(`${label} must be an ISO date-time with an explicit UTC offset or Z suffix.`);
  }
}

export function validateExperimentExchange(input: unknown): asserts input is ExperimentExchange {
  const issues: string[] = [];
  if (!input || typeof input !== 'object') throw new Error('Import is not a JSON object.');
  const envelope = input as Partial<ExperimentExchange>;
  if (envelope.format !== EXCHANGE_FORMAT) issues.push(`Expected format "${EXCHANGE_FORMAT}".`);
  if (![1, 2, EXCHANGE_VERSION].includes(envelope.version ?? -1)) issues.push(`Unsupported format version. Expected 1, 2, or ${EXCHANGE_VERSION}.`);
  requireExplicitTimestamp(envelope.exportedAt, 'Exported date-time', issues);
  const experiment = envelope.experiment as Experiment | undefined;
  if (!experiment || typeof experiment !== 'object') issues.push('Experiment record is missing.');
  if (experiment) {
    if (!experiment.id || !experiment.title || !experiment.projectId) issues.push('Experiment id, title, and projectId are required.');
    const conditions = experiment.conditions ?? [];
    const specimens = experiment.specimens ?? [];
    const runs = experiment.runs ?? [];
    const measurements = experiment.measurements ?? [];
    const methods = experiment.methodRevisions ?? [];
    const variables = experiment.variables ?? [];
    const sources = experiment.sources ?? [];
    const instruments = experiment.instruments ?? [];
    const calibrations = experiment.calibrations ?? [];
    const missingObservations = experiment.missingObservations ?? [];
    const methodValidationAssessments = experiment.methodValidationAssessments ?? [];
    requireUnique(conditions.map((item) => item.id), 'Conditions', issues);
    requireUnique(specimens.map((item) => item.id), 'Specimens', issues);
    requireUnique(runs.map((item) => item.id), 'Runs', issues);
    requireUnique(measurements.map((item) => item.id), 'Measurements', issues);
    requireUnique(variables.map((item) => item.id), 'Variables', issues);
    requireUnique(sources.map((item) => item.id), 'Sources', issues);
    requireUnique(instruments.map((item) => item.id), 'Instruments', issues);
    requireUnique(calibrations.map((item) => item.id), 'Calibrations', issues);
    requireUnique(missingObservations.map((item) => item.id), 'Missing observations', issues);
    requireUnique(methodValidationAssessments.map((item) => item.id), 'Method validation assessments', issues);
    variables.forEach((item) => {
      if (!item.name?.trim()) issues.push(`Variable ${item.id || '(unknown)'} has no name.`);
      if (!item.unit?.trim()) issues.push(`Variable ${item.id || '(unknown)'} has no unit; use "dimensionless" when no physical unit applies.`);
    });
    requireExplicitTimestamp(experiment.createdAt, 'Experiment created date-time', issues);
    requireExplicitTimestamp(experiment.updatedAt, 'Experiment updated date-time', issues);
    methods.forEach((item) => requireExplicitTimestamp(item.createdAt, `Method ${item.id} created date-time`, issues));
    runs.forEach((item) => {
      requireExplicitTimestamp(item.startedAt, `Run ${item.id} started date-time`, issues);
      if (item.completedAt) requireExplicitTimestamp(item.completedAt, `Run ${item.id} completed date-time`, issues);
    });
    measurements.forEach((item) => {
      requireExplicitTimestamp(item.recordedAt, `Measurement ${item.id} recorded date-time`, issues);
      item.corrections.forEach((correction) => requireExplicitTimestamp(correction.timestamp, `Correction ${correction.id} date-time`, issues));
      item.revisions?.forEach((revision) => requireExplicitTimestamp(revision.timestamp, `Measurement revision ${revision.id} date-time`, issues));
    });
    experiment.analyses.forEach((item) => requireExplicitTimestamp(item.createdAt, `Analysis ${item.id} created date-time`, issues));
    experiment.notes.forEach((item) => requireExplicitTimestamp(item.createdAt, `Note ${item.id} created date-time`, issues));
    experiment.attachments.forEach((item) => requireExplicitTimestamp(item.createdAt, `Attachment ${item.id} created date-time`, issues));
    methodValidationAssessments.forEach((item) => requireExplicitTimestamp(item.assessedAt, `Method validation assessment ${item.id} date-time`, issues));
    const conditionIds = new Set(conditions.map((item) => item.id));
    const specimenIds = new Set(specimens.map((item) => item.id));
    const runIds = new Set(runs.map((item) => item.id));
    const methodIds = new Set(methods.map((item) => item.id));
    const variableIds = new Set(variables.map((item) => item.id));
    const sourceIds = new Set(sources.map((item) => item.id));
    const instrumentIds = new Set(instruments.map((item) => item.id));
    const calibrationIds = new Set(calibrations.map((item) => item.id));
    specimens.forEach((item) => { if (!conditionIds.has(item.conditionId)) issues.push(`Specimen ${item.id} references a missing condition.`); });
    runs.forEach((item) => {
      if (!methodIds.has(item.methodRevisionId)) issues.push(`Run ${item.id} references a missing method revision.`);
      item.specimenIds.forEach((id) => { if (!specimenIds.has(id)) issues.push(`Run ${item.id} references a missing specimen.`); });
    });
    measurements.forEach((item) => {
      if (!conditionIds.has(item.conditionId) || !specimenIds.has(item.specimenId) || !runIds.has(item.runId)) issues.push(`Measurement ${item.id} has an invalid reference.`);
      if (item.context?.sourceId && !sourceIds.has(item.context.sourceId)) issues.push(`Measurement ${item.id} references a missing source.`);
      if (item.context?.instrumentId && !instrumentIds.has(item.context.instrumentId)) issues.push(`Measurement ${item.id} references a missing instrument.`);
      if (item.context?.calibrationId && !calibrationIds.has(item.context.calibrationId)) issues.push(`Measurement ${item.id} references a missing calibration.`);
    });
    calibrations.forEach((item) => { if (!instrumentIds.has(item.instrumentId)) issues.push(`Calibration ${item.id} references a missing instrument.`); });
    missingObservations.forEach((item) => { if (!specimenIds.has(item.specimenId) || !runIds.has(item.runId) || !variableIds.has(item.variableId)) issues.push(`Missing observation ${item.id} has an invalid reference.`); });
    experiment.imports?.forEach((item) => { if (!sourceIds.has(item.sourceId)) issues.push(`Import ${item.id} references a missing source.`); });
    methodValidationAssessments.forEach((item) => {
      if (!item.methodRevisionIds.length || item.methodRevisionIds.some((id) => !methodIds.has(id))) issues.push(`Method validation assessment ${item.id} references a missing method revision.`);
      else if (!methodAssessmentTargetsMatch(experiment, item)) issues.push(`Method validation assessment ${item.id} has a procedure fingerprint that does not match every targeted method revision.`);
      if (item.evidenceIds.some((id) => !experiment.validationEvidence?.some((evidence) => evidence.id === id))) issues.push(`Method validation assessment ${item.id} references missing evidence.`);
    });
    experiment.analyses.forEach((analysis) => {
      analysis.includedMeasurementIds?.forEach((id) => { if (!measurements.some((measurement) => measurement.id === id)) issues.push(`Analysis ${analysis.id} references missing measurement ${id}.`); });
      analysis.exclusions.forEach((item) => { if (!measurements.some((measurement) => measurement.id === item.measurementId)) issues.push(`Analysis ${analysis.id} exclusion references missing measurement ${item.measurementId}.`); });
    });
  }
  if (issues.length) throw new Error(issues.join(' '));
}

export function remapImportedExperiment(exchange: ExperimentExchange, now = Date.now()): Experiment {
  validateExperimentExchange(exchange);
  const source = structuredClone(exchange.experiment);
  const prefix = `import-${now}`;
  source.methodValidationAssessments = source.methodValidationAssessments ?? [];
  source.methodRevisions.filter((method) => method.validationStatus === 'validated').forEach((method, index) => {
    if (source.methodValidationAssessments!.some((assessment) => assessment.methodRevisionIds.includes(method.id))) return;
    source.methodValidationAssessments!.push({ id: `legacy-import-method-validation-${index + 1}`, methodRevisionIds: [method.id], procedureFingerprint: methodProcedureFingerprint(method), decision: 'validated', reviewer: 'Legacy import; reviewer unknown', assessedAt: method.createdAt, retrospective: true, intendedUse: method.intendedUse ?? '', limitations: method.useLimitations ?? '', evidenceIds: [...(method.validationEvidenceIds ?? [])], rationale: 'Migrated from validation metadata embedded in this exact imported method revision.' });
  });
  const remap = <T extends { id: string }>(items: T[], kind: string): Map<string, string> => new Map(items.map((item, index) => [item.id, `${prefix}-${kind}-${index + 1}`]));
  const conditionIds = remap(source.conditions, 'condition');
  const methodIds = remap(source.methodRevisions, 'method');
  const specimenIds = remap(source.specimens, 'specimen');
  const runIds = remap(source.runs, 'run');
  const measurementIds = remap(source.measurements, 'measurement');
  const sourceIds = remap(source.sources ?? [], 'source');
  const instrumentIds = remap(source.instruments ?? [], 'instrument');
  const calibrationIds = remap(source.calibrations ?? [], 'calibration');
  const attachmentIds = remap(source.attachments, 'attachment');
  const analysisIds = remap(source.analyses, 'analysis');
  const evidenceIds = remap(source.validationEvidence ?? [], 'evidence');
  const methodAssessmentIds = remap(source.methodValidationAssessments ?? [], 'method-validation');
  source.conditions.forEach((item) => { item.id = conditionIds.get(item.id)!; });
  source.methodRevisions.forEach((item) => { item.id = methodIds.get(item.id)!; });
  source.specimens.forEach((item) => { item.conditionId = conditionIds.get(item.conditionId)!; item.id = specimenIds.get(item.id)!; });
  source.runs.forEach((item) => { item.specimenIds = item.specimenIds.map((id) => specimenIds.get(id)!); item.methodRevisionId = methodIds.get(item.methodRevisionId)!; item.instrumentIds = item.instrumentIds?.map((id) => instrumentIds.get(id)!).filter(Boolean); item.id = runIds.get(item.id)!; });
  source.measurements.forEach((item) => {
    const oldId = item.id;
    item.specimenId = specimenIds.get(item.specimenId)!;
    item.runId = runIds.get(item.runId)!;
    item.conditionId = conditionIds.get(item.conditionId)!;
    item.id = measurementIds.get(oldId)!;
    if (item.context?.sourceId) item.context.sourceId = sourceIds.get(item.context.sourceId)!;
    if (item.context?.instrumentId) item.context.instrumentId = instrumentIds.get(item.context.instrumentId)!;
    if (item.context?.calibrationId) item.context.calibrationId = calibrationIds.get(item.context.calibrationId)!;
    item.corrections.forEach((correction, index) => { correction.id = `${prefix}-correction-${oldId}-${index + 1}`; });
  });
  source.analyses.forEach((analysis) => {
    analysis.id = analysisIds.get(analysis.id)!;
    analysis.settings.conditionIds = analysis.settings.conditionIds.map((id) => conditionIds.get(id)).filter((id): id is string => Boolean(id));
    analysis.settings.specimenIds = analysis.settings.specimenIds.map((id) => specimenIds.get(id)).filter((id): id is string => Boolean(id));
    analysis.settings.runIds = analysis.settings.runIds.map((id) => runIds.get(id)).filter((id): id is string => Boolean(id));
    analysis.exclusions = analysis.exclusions.map((exclusion) => ({ ...exclusion, measurementId: measurementIds.get(exclusion.measurementId)! }));
    analysis.includedMeasurementIds = analysis.includedMeasurementIds?.map((id) => measurementIds.get(id)!);
  });
  source.sources?.forEach((item) => { item.id = sourceIds.get(item.id)!; });
  source.instruments?.forEach((item) => { item.id = instrumentIds.get(item.id)!; });
  source.calibrations?.forEach((item) => { item.instrumentId = instrumentIds.get(item.instrumentId)!; item.evidenceAttachmentIds = item.evidenceAttachmentIds.map((id) => attachmentIds.get(id)!).filter(Boolean); item.id = calibrationIds.get(item.id)!; });
  source.imports?.forEach((item, index) => { item.id = `${prefix}-import-${index + 1}`; item.sourceId = sourceIds.get(item.sourceId)!; });
  source.missingObservations?.forEach((item, index) => { item.id = `${prefix}-missing-${index + 1}`; item.specimenId = specimenIds.get(item.specimenId)!; item.runId = runIds.get(item.runId)!; });
  source.validationEvidence?.forEach((item) => { item.id = evidenceIds.get(item.id)!; item.attachmentIds = item.attachmentIds.map((id) => attachmentIds.get(id)!).filter(Boolean); });
  source.methodRevisions.forEach((item) => { item.validationEvidenceIds = item.validationEvidenceIds?.map((id) => evidenceIds.get(id)!).filter(Boolean); });
  source.methodValidationAssessments?.forEach((item) => { item.id = methodAssessmentIds.get(item.id)!; item.methodRevisionIds = item.methodRevisionIds.map((id) => methodIds.get(id)!).filter(Boolean); item.evidenceIds = item.evidenceIds.map((id) => evidenceIds.get(id)!).filter(Boolean); });
  source.scientificReviews?.forEach((item, index) => { item.id = `${prefix}-review-${index + 1}`; if (item.scope === 'method') item.targetId = methodIds.get(item.targetId) ?? item.targetId; if (item.scope === 'analysis') item.targetId = analysisIds.get(item.targetId) ?? item.targetId; if (item.scope === 'experiment') item.targetId = `${prefix}-experiment`; });
  source.reportReleases?.forEach((item, index) => { item.id = `${prefix}-release-${index + 1}`; item.methodRevisionIds = item.methodRevisionIds.map((id) => methodIds.get(id)!).filter(Boolean); if (item.analysisId) item.analysisId = analysisIds.get(item.analysisId); });
  if (source.conclusionEvidence?.analysisId) source.conclusionEvidence.analysisId = analysisIds.get(source.conclusionEvidence.analysisId);
  if (source.conclusionEvidence?.methodRevisionIds) source.conclusionEvidence.methodRevisionIds = source.conclusionEvidence.methodRevisionIds.map((id) => methodIds.get(id)!).filter(Boolean);
  source.notes.forEach((item, index) => { item.id = `${prefix}-note-${index + 1}`; });
  source.attachments.forEach((item) => { item.id = attachmentIds.get(item.id)!; });
  const originalId = source.id;
  source.id = `${prefix}-experiment`;
  source.code = `${source.code}-COPY`;
  source.title = `${source.title} (imported copy)`;
  source.sourceExperimentId = originalId;
  source.importProvenance = `Imported from ${originalId}; export created ${exchange.exportedAt}. Attachment bytes were not included.`;
  source.createdAt = new Date(now).toISOString();
  source.updatedAt = source.createdAt;
  return source;
}

export function importIntoWorkspace(workspace: Workspace, input: unknown, now = Date.now()): Workspace {
  validateExperimentExchange(input);
  const experiment = remapImportedExperiment(input, now);
  return { ...workspace, experiments: [...workspace.experiments, experiment] };
}
