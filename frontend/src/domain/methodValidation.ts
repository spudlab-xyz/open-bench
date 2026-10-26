import type { Experiment, MethodRevision, MethodValidationAssessment } from '../types';

export type EffectiveMethodValidationStatus = 'prospective-validated' | 'retrospective-validated' | 'limited' | 'failed' | 'pending' | 'legacy-approved' | 'unvalidated';

export interface EffectiveMethodValidation {
  status: EffectiveMethodValidationStatus;
  assessment?: MethodValidationAssessment;
}

function normalizedProcedure(method: MethodRevision): Record<string, unknown> {
  return {
    title: method.title.trim(),
    steps: method.steps.map((step) => step.trim()).filter(Boolean),
    equipment: method.equipment.trim(),
    notes: method.notes.trim(),
  };
}

export function methodProcedureFingerprint(method: MethodRevision): string {
  const text = JSON.stringify(normalizedProcedure(method));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `method-fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function identicalMethodRevisionIds(experiment: Experiment, methodRevisionId: string): string[] {
  const method = experiment.methodRevisions.find((revision) => revision.id === methodRevisionId);
  if (!method) return [];
  const fingerprint = methodProcedureFingerprint(method);
  return experiment.methodRevisions.filter((revision) => methodProcedureFingerprint(revision) === fingerprint).map((revision) => revision.id);
}

export function methodAssessmentTargetsMatch(experiment: Experiment, assessment: Pick<MethodValidationAssessment, 'methodRevisionIds' | 'procedureFingerprint'>): boolean {
  return assessment.methodRevisionIds.length > 0 && assessment.methodRevisionIds.every((id) => {
    const method = experiment.methodRevisions.find((revision) => revision.id === id);
    return Boolean(method && methodProcedureFingerprint(method) === assessment.procedureFingerprint);
  });
}

export function effectiveMethodValidation(experiment: Experiment, methodRevisionId: string): EffectiveMethodValidation {
  const method = experiment.methodRevisions.find((revision) => revision.id === methodRevisionId);
  if (!method) return { status: 'unvalidated' };
  const fingerprint = methodProcedureFingerprint(method);
  const assessment = [...(experiment.methodValidationAssessments ?? [])]
    .filter((item) => item.methodRevisionIds.includes(methodRevisionId) && item.procedureFingerprint === fingerprint)
    .sort((left, right) => right.assessedAt.localeCompare(left.assessedAt))[0];
  if (assessment) {
    if (assessment.decision === 'validated') return { status: assessment.retrospective ? 'retrospective-validated' : 'prospective-validated', assessment };
    return { status: assessment.decision, assessment };
  }
  if (experiment.scientificReviews?.some((review) => review.scope === 'method' && review.targetId === methodRevisionId && review.decision === 'approved')) return { status: 'legacy-approved' };
  if (method.validationStatus === 'validated') return { status: 'legacy-approved' };
  return { status: 'unvalidated' };
}

export function methodValidationLabel(status: EffectiveMethodValidationStatus): string {
  return ({
    'prospective-validated': 'Prospectively validated',
    'retrospective-validated': 'Retrospectively validated',
    limited: 'Limited validation',
    failed: 'Validation failed',
    pending: 'Validation pending',
    'legacy-approved': 'Legacy approved',
    unvalidated: 'Unvalidated',
  })[status];
}

export function methodValidationIsReady(status: EffectiveMethodValidationStatus): boolean {
  return status === 'prospective-validated' || status === 'retrospective-validated' || status === 'legacy-approved';
}

export function methodAssessmentIsRetrospective(experiment: Experiment, methodRevisionIds: string[], assessedAt: string, explicitlyRetrospective: boolean): boolean {
  if (explicitlyRetrospective) return true;
  const assessedTime = Date.parse(assessedAt);
  return experiment.runs.some((run) => methodRevisionIds.includes(run.methodRevisionId) && Date.parse(run.startedAt) < assessedTime);
}
