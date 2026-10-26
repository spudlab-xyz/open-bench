import { describe, expect, it } from 'vitest';
import type { SavedAnalysis } from '../types';
import { hasAnalysisContentChanges } from './analyses';

const analysis = (overrides: Partial<SavedAnalysis> = {}): SavedAnalysis => ({
  id: 'analysis-v1',
  name: 'Temperature outcome',
  revision: 1,
  sourceDataRevision: 3,
  createdAt: '2026-10-01T09:00:00.000Z',
  settings: {
    variableId: 'temperature',
    comparison: 'observed',
    selectedPoint: 10,
    conditionIds: ['control', 'treated'],
    specimenIds: [],
    runIds: [],
    showTrajectories: true,
    chartType: 'line',
  },
  exclusions: [{ measurementId: 'reading-2', reason: 'Instrument warning.' }],
  notes: 'Primary comparison.',
  ...overrides,
});

describe('saved analysis revisions', () => {
  it('rejects generated metadata and set ordering as substantive changes', () => {
    const previous = analysis();
    const next = analysis({
      id: 'analysis-v2',
      revision: 2,
      createdAt: '2026-10-02T09:00:00.000Z',
      settings: { ...previous.settings, conditionIds: ['treated', 'control'] },
      exclusions: [{ measurementId: 'reading-2', reason: ' Instrument warning. ' }],
      notes: ' Primary comparison. ',
    });
    expect(hasAnalysisContentChanges(previous, next)).toBe(false);
  });

  it('detects changed data, settings, exclusions, and notes', () => {
    const previous = analysis();
    expect(hasAnalysisContentChanges(previous, { ...previous, sourceDataRevision: 4 })).toBe(true);
    expect(hasAnalysisContentChanges(previous, { ...previous, settings: { ...previous.settings, selectedPoint: 20 } })).toBe(true);
    expect(hasAnalysisContentChanges(previous, { ...previous, exclusions: [] })).toBe(true);
    expect(hasAnalysisContentChanges(previous, { ...previous, notes: 'Secondary comparison.' })).toBe(true);
  });
});
