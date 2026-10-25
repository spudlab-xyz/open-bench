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
  steps: StepChange[];
  changedSections: number;
}

function normaliseSteps(steps: string[]): string[] {
  return steps.map((step) => step.trim()).filter(Boolean);
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
  return {
    title,
    equipment,
    notes,
    steps,
    changedSections: Number(title.changed) + Number(equipment.changed) + Number(notes.changed) + Number(steps.some((step) => step.status !== 'unchanged')),
  };
}
