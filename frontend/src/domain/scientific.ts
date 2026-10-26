import type { Experiment, MeasurementValueMetadata, SavedAnalysis, ScientificReview, Workspace } from '../types';
import { effectiveMethodValidation, methodProcedureFingerprint, methodValidationIsReady } from './methodValidation';

export const APPLICATION_VERSION = 'openbench-frontend-0.1.0';
export const ANALYSIS_ALGORITHM_ID = 'openbench-exact-point-descriptive';
export const ANALYSIS_ALGORITHM_VERSION = '1.0.0';

export interface ScientificReviewTargetOption {
  id: string;
  label: string;
}

export function scientificReviewTargetOptions(
  experiment: Experiment,
  scope: ScientificReview['scope'],
): ScientificReviewTargetOption[] {
  if (scope === 'method') {
    return [...experiment.methodRevisions]
      .sort((left, right) => left.version - right.version)
      .map((revision) => ({ id: revision.id, label: `Method v${revision.version} — ${revision.title}` }));
  }
  if (scope === 'analysis') {
    return [...experiment.analyses]
      .sort((left, right) => left.name.localeCompare(right.name) || left.revision - right.revision)
      .map((analysis) => ({
        id: analysis.id,
        label: `${analysis.name} · analysis v${analysis.revision} · data revision ${analysis.sourceDataRevision}${analysisIsStale(experiment, analysis) ? ' (stale)' : ''}`,
      }));
  }
  return [];
}

export function scientificReviewTargetId(
  experiment: Experiment,
  scope: ScientificReview['scope'],
  selectedTargetId: string,
): string | null {
  if (scope !== 'method' && scope !== 'analysis') return experiment.id;
  return scientificReviewTargetOptions(experiment, scope).some((option) => option.id === selectedTargetId)
    ? selectedTargetId
    : null;
}

type LegacyWorkspace = Omit<Workspace, 'schemaVersion'> & { schemaVersion: number };

export function stableChecksum(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function legacyValueMetadata(experiment: Experiment, measurementIndex: number): Record<string, MeasurementValueMetadata> {
  const measurement = experiment.measurements[measurementIndex];
  return Object.fromEntries(experiment.variables.map((variable) => {
    const value = measurement.values[variable.id];
    return [variable.id, {
      kind: measurement.corrections.some((correction) => correction.variableId === variable.id) ? 'corrected-observation' : (variable.valueKind ?? 'raw-observation'),
      precision: variable.precision,
      uncertainty: variable.uncertainty,
      detectionLimit: variable.detectionLimit,
      missingReason: value === null ? 'unknown' : undefined,
    } satisfies MeasurementValueMetadata];
  }));
}

export function upgradeScientificWorkspace(workspace: LegacyWorkspace): Workspace {
  return {
    ...workspace,
    schemaVersion: 4,
    experiments: workspace.experiments.map((experiment) => {
      const methodRevisions = experiment.methodRevisions.map((method) => ({
        ...method,
        validationStatus: method.validationStatus ?? 'unvalidated' as const,
        intendedUse: method.intendedUse ?? '',
        useLimitations: method.useLimitations ?? '',
        validationEvidenceIds: method.validationEvidenceIds ?? [],
      }));
      const methodValidationAssessments = structuredClone(experiment.methodValidationAssessments ?? []);
      methodRevisions.filter((method) => method.validationStatus === 'validated').forEach((method) => {
        if (methodValidationAssessments.some((assessment) => assessment.methodRevisionIds.includes(method.id))) return;
        methodValidationAssessments.push({
          id: `legacy-method-validation-${method.id}`,
          methodRevisionIds: [method.id],
          procedureFingerprint: methodProcedureFingerprint(method),
          decision: 'validated',
          reviewer: 'Legacy record; reviewer unknown',
          assessedAt: method.createdAt,
          retrospective: true,
          intendedUse: method.intendedUse ?? '',
          limitations: method.useLimitations ?? '',
          evidenceIds: [...(method.validationEvidenceIds ?? [])],
          rationale: 'Migrated from validation metadata embedded in this exact method revision.',
        });
      });
      return {
      ...experiment,
      intendedUse: experiment.intendedUse ?? '',
      useLimitations: experiment.useLimitations ?? experiment.limitations ?? '',
      sources: experiment.sources ?? [],
      instruments: experiment.instruments ?? [],
      calibrations: experiment.calibrations ?? [],
      imports: experiment.imports ?? [],
      missingObservations: experiment.missingObservations ?? [],
      validationEvidence: experiment.validationEvidence ?? [],
      methodValidationAssessments,
      scientificReviews: experiment.scientificReviews ?? [],
      reportReleases: experiment.reportReleases ?? [],
      variables: experiment.variables.map((variable) => ({ ...variable, valueKind: variable.valueKind ?? 'raw-observation' })),
      methodRevisions,
      runs: experiment.runs.map((run) => ({ ...run, deviationImpact: run.deviationImpact ?? (run.deviations ? 'unknown' : 'none'), instrumentIds: run.instrumentIds ?? [] })),
      measurements: experiment.measurements.map((measurement, index) => ({
        ...measurement,
        context: measurement.context ?? { acquisitionMethod: 'legacy-unknown', acquiredAt: measurement.recordedAt, clockAssumption: 'Legacy record; original clock context was not captured.' },
        valueMetadata: measurement.valueMetadata ?? legacyValueMetadata(experiment, index),
        qualityReason: measurement.qualityReason ?? (measurement.quality !== 'valid' ? measurement.notes : ''),
      })),
      analyses: experiment.analyses.map((analysis) => ({
        ...analysis,
        algorithmId: analysis.algorithmId ?? ANALYSIS_ALGORITHM_ID,
        algorithmVersion: analysis.algorithmVersion ?? 'legacy-unknown',
        applicationVersion: analysis.applicationVersion ?? 'legacy-unknown',
        formula: analysis.formula ?? 'Exact selected point; optional selected point minus exact baseline; descriptive summaries by condition.',
        aggregationRule: analysis.aggregationRule ?? 'One outcome per physical specimen; first selected run cycle; no interpolation.',
        includedMeasurementIds: analysis.includedMeasurementIds ?? [],
        roundingPolicy: analysis.roundingPolicy ?? 'Stored values are calculated without rounding; interface display may round.',
        unitConversions: analysis.unitConversions ?? [],
        referenceDataVersions: analysis.referenceDataVersions ?? [],
      })),
      conclusionEvidence: experiment.conclusionEvidence ?? (experiment.conclusion ? {
        dataRevision: experiment.dataRevision,
        analysisId: experiment.analyses.at(-1)?.id,
        analysisRevision: experiment.analyses.at(-1)?.revision,
        authoredAt: experiment.updatedAt,
        methodRevisionIds: [...new Set(experiment.runs.map((run) => run.methodRevisionId))],
      } : undefined),
    }; }),
  };
}

export function analysisIsStale(experiment: Experiment, analysis?: SavedAnalysis): boolean {
  return Boolean(analysis && analysis.sourceDataRevision !== experiment.dataRevision);
}

export function conclusionIsStale(experiment: Experiment): boolean {
  if (!experiment.conclusion) return false;
  const evidence = experiment.conclusionEvidence;
  if (!evidence || evidence.dataRevision !== experiment.dataRevision) return true;
  const currentMethodIds = [...new Set(experiment.runs.map((run) => run.methodRevisionId))].sort();
  if (JSON.stringify([...(evidence.methodRevisionIds ?? [])].sort()) !== JSON.stringify(currentMethodIds)) return true;
  if (!evidence.analysisId) return false;
  const analysis = experiment.analyses.find((item) => item.id === evidence.analysisId && item.revision === evidence.analysisRevision);
  return !analysis || analysis.sourceDataRevision !== experiment.dataRevision;
}

export function calibrationWarnings(experiment: Experiment): string[] {
  const warnings: string[] = [];
  const now = Date.now();
  for (const run of experiment.runs) for (const instrumentId of run.instrumentIds ?? []) {
    const instrument = experiment.instruments?.find((item) => item.id === instrumentId);
    const calibrations = (experiment.calibrations ?? []).filter((item) => item.instrumentId === instrumentId).sort((left, right) => right.calibratedAt.localeCompare(left.calibratedAt));
    const calibration = calibrations[0];
    if (!calibration) warnings.push(`${instrument?.name ?? instrumentId} has no calibration record.`);
    else if (calibration.result === 'failed') warnings.push(`${instrument?.name ?? instrumentId} has a failed latest calibration.`);
    else if (calibration.validUntil && Date.parse(calibration.validUntil) < now) warnings.push(`${instrument?.name ?? instrumentId} calibration expired ${calibration.validUntil}.`);
  }
  return [...new Set(warnings)];
}

export function scientificReadinessIssues(experiment: Experiment): string[] {
  const requiredMethodIds = new Set(experiment.runs.length ? experiment.runs.map((run) => run.methodRevisionId) : experiment.methodRevisions.at(-1) ? [experiment.methodRevisions.at(-1)!.id] : []);
  const unresolvedMethods = [...requiredMethodIds].map((id) => ({ id, validation: effectiveMethodValidation(experiment, id) })).filter((item) => !methodValidationIsReady(item.validation.status));
  const failedMethods = unresolvedMethods.filter((item) => item.validation.status === 'failed').length;
  const limitedMethods = unresolvedMethods.filter((item) => item.validation.status === 'limited').length;
  const issues = [
    !experiment.question && 'Research question is not recorded.',
    !experiment.variedFactor && 'Varied factor is not recorded.',
    !experiment.measuredOutcome && 'Measured outcome is not recorded.',
    experiment.variables.some((variable) => !variable.unit.trim()) && 'A variable has no explicit unit.',
    !experiment.schedule && 'Measurement schedule is not recorded.',
    !experiment.intendedUse?.trim() && 'Intended use is not recorded.',
    !experiment.useLimitations?.trim() && 'Conditions of use and limitations are not recorded.',
    Boolean(experiment.conclusion) && !experiment.limitations.trim() && 'A conclusion exists without recorded limitations.',
    !experiment.sources?.length && 'No observation source or provenance record is defined.',
    experiment.sources?.some((source) => source.permissionStatus === 'not-reviewed' || source.permissionStatus === 'prohibited') && 'One or more observation sources lack usable permission review.',
    unresolvedMethods.length > 0 && `${unresolvedMethods.length} method revision${unresolvedMethods.length === 1 ? '' : 's'} used by this experiment ${unresolvedMethods.length === 1 ? 'lacks' : 'lack'} applicable validation${failedMethods ? ` (${failedMethods} failed)` : ''}${limitedMethods ? ` (${limitedMethods} limited)` : ''}.`,
    experiment.measurements.some((measurement) => measurement.quality !== 'valid') && 'Measurements have unresolved quality flags.',
    analysisIsStale(experiment, experiment.analyses.at(-1)) && 'The latest saved analysis is stale.',
    conclusionIsStale(experiment) && 'The researcher conclusion is stale.',
    !experiment.scientificReviews?.some((review) => review.scope === 'report' && review.decision === 'approved' && review.dataRevision === experiment.dataRevision) && 'No approved scientific report review exists for the current data revision.',
    ...calibrationWarnings(experiment),
  ].filter((issue): issue is string => Boolean(issue));
  return [...new Set(issues)];
}
