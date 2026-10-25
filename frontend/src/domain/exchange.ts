import type { Experiment, Workspace } from '../types';

export const EXCHANGE_FORMAT = 'openbench-experiment';
export const EXCHANGE_VERSION = 1;

export interface ExperimentExchange {
  format: typeof EXCHANGE_FORMAT;
  version: typeof EXCHANGE_VERSION;
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

export function validateExperimentExchange(input: unknown): asserts input is ExperimentExchange {
  const issues: string[] = [];
  if (!input || typeof input !== 'object') throw new Error('Import is not a JSON object.');
  const envelope = input as Partial<ExperimentExchange>;
  if (envelope.format !== EXCHANGE_FORMAT) issues.push(`Expected format "${EXCHANGE_FORMAT}".`);
  if (envelope.version !== EXCHANGE_VERSION) issues.push(`Unsupported format version. Expected ${EXCHANGE_VERSION}.`);
  const experiment = envelope.experiment as Experiment | undefined;
  if (!experiment || typeof experiment !== 'object') issues.push('Experiment record is missing.');
  if (experiment) {
    if (!experiment.id || !experiment.title || !experiment.projectId) issues.push('Experiment id, title, and projectId are required.');
    const conditions = experiment.conditions ?? [];
    const specimens = experiment.specimens ?? [];
    const runs = experiment.runs ?? [];
    const measurements = experiment.measurements ?? [];
    const methods = experiment.methodRevisions ?? [];
    requireUnique(conditions.map((item) => item.id), 'Conditions', issues);
    requireUnique(specimens.map((item) => item.id), 'Specimens', issues);
    requireUnique(runs.map((item) => item.id), 'Runs', issues);
    requireUnique(measurements.map((item) => item.id), 'Measurements', issues);
    const conditionIds = new Set(conditions.map((item) => item.id));
    const specimenIds = new Set(specimens.map((item) => item.id));
    const runIds = new Set(runs.map((item) => item.id));
    const methodIds = new Set(methods.map((item) => item.id));
    specimens.forEach((item) => { if (!conditionIds.has(item.conditionId)) issues.push(`Specimen ${item.id} references a missing condition.`); });
    runs.forEach((item) => {
      if (!methodIds.has(item.methodRevisionId)) issues.push(`Run ${item.id} references a missing method revision.`);
      item.specimenIds.forEach((id) => { if (!specimenIds.has(id)) issues.push(`Run ${item.id} references a missing specimen.`); });
    });
    measurements.forEach((item) => {
      if (!conditionIds.has(item.conditionId) || !specimenIds.has(item.specimenId) || !runIds.has(item.runId)) issues.push(`Measurement ${item.id} has an invalid reference.`);
    });
  }
  if (issues.length) throw new Error(issues.join(' '));
}

export function remapImportedExperiment(exchange: ExperimentExchange, now = Date.now()): Experiment {
  validateExperimentExchange(exchange);
  const source = structuredClone(exchange.experiment);
  const prefix = `import-${now}`;
  const remap = <T extends { id: string }>(items: T[], kind: string): Map<string, string> => new Map(items.map((item, index) => [item.id, `${prefix}-${kind}-${index + 1}`]));
  const conditionIds = remap(source.conditions, 'condition');
  const methodIds = remap(source.methodRevisions, 'method');
  const specimenIds = remap(source.specimens, 'specimen');
  const runIds = remap(source.runs, 'run');
  const measurementIds = remap(source.measurements, 'measurement');
  source.conditions.forEach((item) => { item.id = conditionIds.get(item.id)!; });
  source.methodRevisions.forEach((item) => { item.id = methodIds.get(item.id)!; });
  source.specimens.forEach((item) => { item.conditionId = conditionIds.get(item.conditionId)!; item.id = specimenIds.get(item.id)!; });
  source.runs.forEach((item) => { item.specimenIds = item.specimenIds.map((id) => specimenIds.get(id)!); item.methodRevisionId = methodIds.get(item.methodRevisionId)!; item.id = runIds.get(item.id)!; });
  source.measurements.forEach((item) => {
    const oldId = item.id;
    item.specimenId = specimenIds.get(item.specimenId)!;
    item.runId = runIds.get(item.runId)!;
    item.conditionId = conditionIds.get(item.conditionId)!;
    item.id = measurementIds.get(oldId)!;
    item.corrections.forEach((correction, index) => { correction.id = `${prefix}-correction-${oldId}-${index + 1}`; });
  });
  source.analyses.forEach((analysis, analysisIndex) => {
    analysis.id = `${prefix}-analysis-${analysisIndex + 1}`;
    analysis.settings.conditionIds = analysis.settings.conditionIds.map((id) => conditionIds.get(id)).filter((id): id is string => Boolean(id));
    analysis.settings.specimenIds = analysis.settings.specimenIds.map((id) => specimenIds.get(id)).filter((id): id is string => Boolean(id));
    analysis.settings.runIds = analysis.settings.runIds.map((id) => runIds.get(id)).filter((id): id is string => Boolean(id));
    analysis.exclusions = analysis.exclusions.map((exclusion) => ({ ...exclusion, measurementId: measurementIds.get(exclusion.measurementId)! })).filter((item) => Boolean(item.measurementId));
  });
  source.notes.forEach((item, index) => { item.id = `${prefix}-note-${index + 1}`; });
  source.attachments.forEach((item, index) => { item.id = `${prefix}-attachment-${index + 1}`; });
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
