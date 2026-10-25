import { describe, expect, it } from 'vitest';
import type { MethodRevision } from '../types';
import { compareMethodRevisions, hasMethodContentChanges } from './methodRevisions';

const revision = (overrides: Partial<MethodRevision> = {}): MethodRevision => ({
  id: 'method-v1',
  version: 1,
  title: 'Cooling method',
  steps: ['Heat water', 'Record temperature'],
  equipment: 'Probe and timer',
  notes: 'Keep probe depth fixed.',
  changeReason: 'Initial method definition.',
  createdAt: '2026-10-01T09:00:00.000Z',
  ...overrides,
});

describe('method revision audit comparison', () => {
  it('rejects drafts whose effective method content has not changed', () => {
    const current = revision();
    expect(hasMethodContentChanges(current, { ...current, steps: [' Heat water ', 'Record temperature', ''] })).toBe(false);
    expect(hasMethodContentChanges(current, { ...current, equipment: 'Calibrated probe and timer' })).toBe(true);
  });

  it('reports field and positional step changes between immutable revisions', () => {
    const before = revision();
    const after = revision({
      id: 'method-v2',
      version: 2,
      basedOnRevisionId: before.id,
      changeReason: 'Add a stabilisation reading and clarify equipment.',
      steps: ['Heat water', 'Wait two minutes', 'Record temperature'],
      equipment: 'Calibrated probe and timer',
    });
    const comparison = compareMethodRevisions(before, after);
    expect(comparison.equipment.changed).toBe(true);
    expect(comparison.steps.map((step) => step.status)).toEqual(['unchanged', 'modified', 'added']);
    expect(comparison.changedSections).toBe(2);
    expect(before.steps).toEqual(['Heat water', 'Record temperature']);
  });
});
