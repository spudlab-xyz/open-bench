import type { Experiment, Run } from '../types';

export function validateRun(experiment: Experiment, run: Run, previous?: Run): string[] {
  const issues: string[] = [];
  if (!run.name.trim()) issues.push('Give the run a name.');
  if (!run.specimenIds.length) issues.push('Associate at least one specimen with the run.');
  if (new Set(run.specimenIds).size !== run.specimenIds.length) issues.push('A specimen cannot be associated more than once.');
  const knownSpecimenIds = new Set(experiment.specimens.map((specimen) => specimen.id));
  if (run.specimenIds.some((id) => !knownSpecimenIds.has(id))) issues.push('The run references a specimen that is not in this experiment.');
  if (!experiment.methodRevisions.some((method) => method.id === run.methodRevisionId)) issues.push('Choose a method revision from this experiment.');
  const startedAt = Date.parse(run.startedAt);
  if (!Number.isFinite(startedAt)) issues.push('Enter a valid start date and time.');
  if (run.status === 'complete') {
    const completedAt = run.completedAt ? Date.parse(run.completedAt) : Number.NaN;
    if (!Number.isFinite(completedAt)) issues.push('A completed run requires a valid completion date and time.');
    else if (Number.isFinite(startedAt) && completedAt < startedAt) issues.push('Completion cannot be earlier than the run start.');
  } else if (run.completedAt) issues.push('Only completed runs can retain a completion date and time.');
  const measuredSpecimenIds = new Set(experiment.measurements.filter((measurement) => measurement.runId === run.id).map((measurement) => measurement.specimenId));
  if ([...measuredSpecimenIds].some((id) => !run.specimenIds.includes(id))) issues.push('Keep every specimen that already has measurements in this run.');
  if (previous && measuredSpecimenIds.size > 0 && run.methodRevisionId !== previous.methodRevisionId) issues.push('The method revision cannot change after measurements exist; historical runs must retain the procedure actually used.');
  return issues;
}
