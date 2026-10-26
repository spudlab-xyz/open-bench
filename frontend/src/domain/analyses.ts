import type { AnalysisExclusion, AnalysisSettings, SavedAnalysis } from '../types';

type AnalysisContent = Pick<SavedAnalysis, 'sourceDataRevision' | 'settings' | 'exclusions' | 'notes'>;

function canonicalSettings(settings: AnalysisSettings) {
  return {
    variableId: settings.variableId,
    comparison: settings.comparison,
    selectedPoint: settings.selectedPoint,
    baselinePoint: settings.baselinePoint,
    conditionIds: [...settings.conditionIds].sort(),
    specimenIds: [...settings.specimenIds].sort(),
    runIds: [...settings.runIds].sort(),
    showTrajectories: settings.showTrajectories,
    chartType: settings.chartType,
  };
}

function canonicalExclusions(exclusions: AnalysisExclusion[]) {
  return exclusions
    .map((exclusion) => ({ measurementId: exclusion.measurementId, reason: exclusion.reason.trim() }))
    .sort((left, right) => left.measurementId.localeCompare(right.measurementId));
}

export function hasAnalysisContentChanges(previous: SavedAnalysis, next: AnalysisContent): boolean {
  const before = {
    sourceDataRevision: previous.sourceDataRevision,
    settings: canonicalSettings(previous.settings),
    exclusions: canonicalExclusions(previous.exclusions),
    notes: previous.notes.trim(),
  };
  const after = {
    sourceDataRevision: next.sourceDataRevision,
    settings: canonicalSettings(next.settings),
    exclusions: canonicalExclusions(next.exclusions),
    notes: next.notes.trim(),
  };
  return JSON.stringify(before) !== JSON.stringify(after);
}
