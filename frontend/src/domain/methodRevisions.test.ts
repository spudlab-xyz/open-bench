import { describe, expect, it } from 'vitest';
import type { MethodRevision } from '../types';
import { compareMethodRevisions, createInitialMethodRevision, hasMethodContentChanges, selectAdjacentMethodRevisionComparison } from './methodRevisions';

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
  it('creates a fresh unvalidated initial revision from reusable procedure content', () => {
    const source = revision({
      id: 'saved-method',
      title: 'Saved cooling procedure',
      steps: ['  Fill vessel  ', 'Measure temperature'],
      equipment: ' Probe ',
      notes: ' Bench context ',
      validationStatus: 'validated',
      validationEvidenceIds: ['source-evidence'],
    });
    const created = createInitialMethodRevision({
      id: 'new-method',
      createdAt: '2026-10-26T12:00:00.000Z',
      experimentTitle: 'New experiment',
      title: source.title,
      steps: source.steps,
      equipment: source.equipment,
      notes: source.notes,
      sourceTitle: source.title,
    });

    expect(created).toEqual({
      id: 'new-method',
      version: 1,
      changeReason: 'Initial method copied from saved procedure “Saved cooling procedure”.',
      title: 'Saved cooling procedure',
      steps: ['Fill vessel', 'Measure temperature'],
      equipment: 'Probe',
      notes: 'Bench context',
      createdAt: '2026-10-26T12:00:00.000Z',
    });
    expect(created).not.toHaveProperty('validationStatus');
    expect(created).not.toHaveProperty('validationEvidenceIds');
    created.steps.push('New step');
    expect(source.steps).toHaveLength(2);
  });

  it('rejects drafts whose effective method content has not changed', () => {
    const current = revision();
    expect(hasMethodContentChanges(current, { ...current, steps: [' Heat water ', 'Record temperature', ''] })).toBe(false);
    const validationOnly = { ...current, validationStatus: 'validated' as const, intendedUse: 'New intended use.' };
    expect(hasMethodContentChanges(current, validationOnly)).toBe(false);
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

  it('selects the next revision when comparing an earlier revision', () => {
    const revisions = [
      revision(),
      revision({ id: 'method-v2', version: 2 }),
      revision({ id: 'method-v3', version: 3 }),
    ];
    expect(selectAdjacentMethodRevisionComparison(revisions, 'method-v1')).toEqual({
      earlierRevisionId: 'method-v1',
      laterRevisionId: 'method-v2',
    });
    expect(selectAdjacentMethodRevisionComparison(revisions, 'method-v2')).toEqual({
      earlierRevisionId: 'method-v2',
      laterRevisionId: 'method-v3',
    });
  });

  it('selects previous to latest when comparing the latest revision', () => {
    const revisions = [revision({ id: 'method-v2', version: 2 }), revision()];
    expect(selectAdjacentMethodRevisionComparison(revisions, 'method-v2')).toEqual({
      earlierRevisionId: 'method-v1',
      laterRevisionId: 'method-v2',
    });
  });

  it('does not select a comparison without two known revisions', () => {
    expect(selectAdjacentMethodRevisionComparison([revision()], 'method-v1')).toBeNull();
    expect(selectAdjacentMethodRevisionComparison([revision(), revision({ id: 'method-v2', version: 2 })], 'missing')).toBeNull();
  });
});
