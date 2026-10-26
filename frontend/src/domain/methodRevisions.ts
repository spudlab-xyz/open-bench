import type { MethodRevision } from '../types';

export type StepChangeStatus = 'unchanged' | 'modified' | 'added' | 'removed';

export interface StepChange {
  position: number;
  status: StepChangeStatus;
  before?: string;
  after?: string;
}

export interface MethodRevisionComparison {
  title: { changed: boolean; before: string; after: string };
  equipment: { changed: boolean; before: string; after: string };
  notes: { changed: boolean; before: string; after: string };
  validationStatus: { changed: boolean; before: string; after: string };
  intendedUse: { changed: boolean; before: string; after: string };
  useLimitations: { changed: boolean; before: string; after: string };
  validationEvidence: { changed: boolean; before: string; after: string };
  steps: StepChange[];
  changedSections: number;
}

export interface AdjacentMethodRevisionComparison {
  earlierRevisionId: string;
  laterRevisionId: string;
}

export interface InitialMethodRevisionInput {
  id: string;
  createdAt: string;
  experimentTitle: string;
  title: string;
  steps: string[];
  equipment: string;
  notes: string;
  sourceTitle?: string;
}

function normaliseSteps(steps: string[]): string[] {
  return steps.map((step) => step.trim()).filter(Boolean);
}

export function createInitialMethodRevision(input: InitialMethodRevisionInput): MethodRevision {
  return {
    id: input.id,
    version: 1,
    changeReason: input.sourceTitle
      ? `Initial method copied from saved procedure “${input.sourceTitle}”.`
      : 'Initial method definition created during experiment setup.',
    title: input.title.trim() || `${input.experimentTitle.trim()} method`,
    steps: normaliseSteps(input.steps),
    equipment: input.equipment.trim(),
    notes: input.notes.trim(),
    createdAt: input.createdAt,
  };
}

export function hasMethodContentChanges(
  revision: MethodRevision,
  draft: Pick<MethodRevision, 'title' | 'steps' | 'equipment' | 'notes'>,
): boolean {
  const beforeSteps = normaliseSteps(revision.steps);
  const afterSteps = normaliseSteps(draft.steps);
  return revision.title.trim() !== draft.title.trim()
    || revision.equipment.trim() !== draft.equipment.trim()
    || revision.notes.trim() !== draft.notes.trim()
    || beforeSteps.length !== afterSteps.length
    || beforeSteps.some((step, index) => step !== afterSteps[index]);
}

export function selectAdjacentMethodRevisionComparison(
  revisions: MethodRevision[],
  selectedRevisionId: string,
): AdjacentMethodRevisionComparison | null {
  if (revisions.length < 2) return null;
  const ordered = [...revisions].sort((left, right) => left.version - right.version);
  const selectedIndex = ordered.findIndex((revision) => revision.id === selectedRevisionId);
  if (selectedIndex < 0) return null;
  const earlierIndex = selectedIndex === ordered.length - 1 ? selectedIndex - 1 : selectedIndex;
  return {
    earlierRevisionId: ordered[earlierIndex].id,
    laterRevisionId: ordered[earlierIndex + 1].id,
  };
}

export function compareMethodRevisions(before: MethodRevision, after: MethodRevision): MethodRevisionComparison {
  const beforeSteps = normaliseSteps(before.steps);
  const afterSteps = normaliseSteps(after.steps);
  const steps: StepChange[] = Array.from({ length: Math.max(beforeSteps.length, afterSteps.length) }, (_, index) => {
    const previous = beforeSteps[index];
    const current = afterSteps[index];
    if (previous === undefined) return { position: index + 1, status: 'added', after: current };
    if (current === undefined) return { position: index + 1, status: 'removed', before: previous };
    if (previous === current) return { position: index + 1, status: 'unchanged', before: previous, after: current };
    return { position: index + 1, status: 'modified', before: previous, after: current };
  });
  const title = { changed: before.title !== after.title, before: before.title, after: after.title };
  const equipment = { changed: before.equipment !== after.equipment, before: before.equipment, after: after.equipment };
  const notes = { changed: before.notes !== after.notes, before: before.notes, after: after.notes };
  const validationStatus = { changed: before.validationStatus !== after.validationStatus, before: before.validationStatus ?? 'unvalidated', after: after.validationStatus ?? 'unvalidated' };
  const intendedUse = { changed: before.intendedUse !== after.intendedUse, before: before.intendedUse ?? '', after: after.intendedUse ?? '' };
  const useLimitations = { changed: before.useLimitations !== after.useLimitations, before: before.useLimitations ?? '', after: after.useLimitations ?? '' };
  const beforeEvidence = [...(before.validationEvidenceIds ?? [])].sort().join(', ');
  const afterEvidence = [...(after.validationEvidenceIds ?? [])].sort().join(', ');
  const validationEvidence = { changed: beforeEvidence !== afterEvidence, before: beforeEvidence, after: afterEvidence };
  return {
    title,
    equipment,
    notes,
    validationStatus,
    intendedUse,
    useLimitations,
    validationEvidence,
    steps,
    changedSections: Number(title.changed) + Number(equipment.changed) + Number(notes.changed) + Number(validationStatus.changed) + Number(intendedUse.changed) + Number(useLimitations.changed) + Number(validationEvidence.changed) + Number(steps.some((step) => step.status !== 'unchanged')),
  };
}
