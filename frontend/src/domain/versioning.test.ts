import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { appendVersionHistory, changeRequiresReason, collectVersionedEntities, initialiseVersionHistory, isInitialVersionRecord, planVersionChanges, versionRecordsForEntity } from './versioning';

describe('universal version history', () => {
  it('initialises every persisted item at version 1', () => {
    const workspace = createSeedWorkspace();
    const entityTypes = new Set(workspace.versionHistory.map((record) => record.entityType));

    expect(workspace.versionHistory.length).toBeGreaterThan(workspace.experiments.length);
    expect(workspace.versionHistory.every((record) => record.version === 1 && record.operation === 'created')).toBe(true);
    expect(entityTypes).toEqual(new Set([
      'project', 'project lifecycle event', 'experiment', 'conclusion', 'conclusion evidence', 'condition', 'variable', 'method',
      'specimen', 'run', 'measurement', 'measurement correction', 'analysis', 'analysis exclusion', 'note',
      'saved method',
    ]));
    expect(workspace.versionHistory.every(isInitialVersionRecord)).toBe(true);
  });

  it('increments changed items and retains a deletion tombstone', () => {
    const current = createSeedWorkspace();
    const project = current.projects[0];
    const updated = structuredClone(current);
    updated.projects[0].description = 'A revised description.';
    let changes = planVersionChanges(current, updated);
    let versioned = appendVersionHistory(updated, changes, 'Clarify project scope.', 'user', '2026-10-25T12:00:00.000Z');

    const projectVersions = versioned.versionHistory.filter((record) => record.entityType === 'project' && record.entityId === project.id);
    expect(projectVersions.map((record) => record.version)).toEqual([1, 2]);
    expect(projectVersions[1]).toMatchObject({ reason: 'Clarify project scope.', operation: 'updated' });
    expect(projectVersions.filter((record) => !isInitialVersionRecord(record)).map((record) => record.version)).toEqual([2]);

    const afterDeletion = structuredClone(versioned);
    afterDeletion.projects = afterDeletion.projects.filter((item) => item.id !== project.id);
    changes = planVersionChanges(versioned, afterDeletion);
    versioned = appendVersionHistory(afterDeletion, changes, 'Project retired.', 'user', '2026-10-25T13:00:00.000Z');
    const tombstone = versioned.versionHistory.filter((record) => record.entityType === 'project' && record.entityId === project.id).at(-1)!;
    expect(tombstone).toMatchObject({ version: 3, operation: 'deleted', reason: 'Project retired.' });
    expect(tombstone.snapshot).toMatchObject({ id: project.id });
    expect(versionRecordsForEntity(versioned, 'project', project.id).map((record) => record.version)).toEqual([1, 2, 3]);
  });

  it('gives newly added nested items an initial version without changing their parent for timestamp-only updates', () => {
    const current = createSeedWorkspace();
    const next = structuredClone(current);
    const experiment = next.experiments[0];
    experiment.notes.push({ id: 'note-new', text: 'New note', createdAt: '2026-10-25T12:00:00.000Z' });
    experiment.updatedAt = '2026-10-25T12:00:00.000Z';

    const changes = planVersionChanges(current, next);
    expect(changes).toEqual([expect.objectContaining({ entityType: 'note', entityId: 'note-new', operation: 'created' })]);
  });

  it('does not append a version when no versioned data changed', () => {
    const current = createSeedWorkspace();
    const candidate = structuredClone(current);
    candidate.projects[0].updatedAt = '2026-10-26T14:00:00.000Z';
    candidate.experiments[0].updatedAt = '2026-10-26T14:00:00.000Z';

    const changes = planVersionChanges(current, candidate);
    expect(changes).toEqual([]);
    expect(appendVersionHistory(candidate, changes, 'No actual change.', 'user', '2026-10-26T14:00:00.000Z').versionHistory)
      .toEqual(current.versionHistory);
  });

  it('versions conclusions independently from their parent experiment', () => {
    const current = createSeedWorkspace();
    const next = structuredClone(current);
    next.experiments[0].conclusion = 'The treatment increased the measured outcome.';
    next.experiments[0].updatedAt = '2026-10-25T12:00:00.000Z';

    expect(planVersionChanges(current, next)).toEqual([
      expect.objectContaining({ entityType: 'conclusion', entityId: next.experiments[0].id, operation: 'updated' }),
    ]);
  });

  it('audits project details without changing lifecycle state', () => {
    const current = createSeedWorkspace();
    const next = structuredClone(current);
    const project = next.projects[0];
    const originalStatus = project.status;
    const originalEvents = structuredClone(project.lifecycleEvents);
    project.name = `${project.name} revised`;
    project.description = 'Updated project scope and administrative context.';
    project.colour = '#137a7f';
    project.updatedAt = '2026-10-26T12:00:00.000Z';

    const changes = planVersionChanges(current, next);
    expect(changes).toEqual([expect.objectContaining({ entityType: 'project', entityId: project.id, operation: 'updated' })]);
    expect(project.status).toBe(originalStatus);
    expect(project.lifecycleEvents).toEqual(originalEvents);
    const versioned = appendVersionHistory(next, changes, 'Clarify project details.', 'user', '2026-10-26T12:00:00.000Z');
    expect(versionRecordsForEntity(versioned, 'project', project.id).at(-1)).toMatchObject({ version: 2, reason: 'Clarify project details.' });
  });

  it('audits lifecycle status changes with their permanent event', () => {
    const current = createSeedWorkspace();
    const next = structuredClone(current);
    const project = next.projects[0];
    project.status = 'archived';
    project.updatedAt = '2026-10-26T12:00:00.000Z';
    project.lifecycleEvents.push({ id: 'lifecycle-status-test', status: 'archived', changedAt: project.updatedAt, note: 'The project has concluded.' });

    expect(planVersionChanges(current, next)).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'project', entityId: project.id, operation: 'updated' }),
      expect.objectContaining({ entityType: 'project lifecycle event', entityId: 'lifecycle-status-test', operation: 'created' }),
    ]));
  });

  it('uses the supplied reason when a deleted identity is restored', () => {
    const initial = createSeedWorkspace();
    const project = initial.projects[0];
    const removed = structuredClone(initial);
    removed.projects = removed.projects.filter((item) => item.id !== project.id);
    const withTombstone = appendVersionHistory(removed, planVersionChanges(initial, removed), 'Remove obsolete project.', 'user', '2026-10-25T12:00:00.000Z');
    const restored = structuredClone(withTombstone);
    restored.projects.push(project);
    const restoration = planVersionChanges(withTombstone, restored);
    expect(restoration.every((change) => changeRequiresReason(withTombstone, change))).toBe(true);
    const versioned = appendVersionHistory(restored, restoration, 'Demo workspace reset', 'system', '2026-10-25T13:00:00.000Z');
    const latest = versioned.versionHistory.filter((record) => record.entityType === 'project' && record.entityId === project.id).at(-1)!;

    expect(latest).toMatchObject({ version: 3, operation: 'created', reason: 'Demo workspace reset', source: 'system' });
  });

  it('rejects a missing reason for any version after the initial creation', () => {
    const initial = createSeedWorkspace();
    const next = structuredClone(initial);
    next.projects[0].description = 'Changed without an audit reason.';

    expect(() => appendVersionHistory(next, planVersionChanges(initial, next), '  ', 'user', '2026-10-25T12:00:00.000Z'))
      .toThrow(/reason is required to create version 2/i);
  });

  it('does not require a reason for a genuinely new identity', () => {
    const initial = createSeedWorkspace();
    const next = structuredClone(initial);
    next.experiments[0].notes.push({ id: 'brand-new-note', text: 'New observation.', createdAt: '2026-10-25T12:00:00.000Z' });
    const changes = planVersionChanges(initial, next);

    expect(changes).toHaveLength(1);
    expect(changeRequiresReason(initial, changes[0])).toBe(false);
    expect(appendVersionHistory(next, changes, '', 'user', '2026-10-25T12:00:00.000Z').versionHistory.at(-1))
      .toMatchObject({ entityId: 'brand-new-note', version: 1, reason: 'Initial version' });
  });

  it('initialises a legacy workspace once without replacing retained history', () => {
    const current = createSeedWorkspace();
    const legacy = structuredClone(current) as unknown as Omit<typeof current, 'versionHistory'> & { versionHistory?: typeof current.versionHistory };
    delete legacy.versionHistory;
    const migrated = initialiseVersionHistory(legacy, '2026-10-25T12:00:00.000Z');

    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.versionHistory).toHaveLength(collectVersionedEntities(migrated).size);
    expect(initialiseVersionHistory(migrated, '2026-10-25T13:00:00.000Z').versionHistory).toEqual(migrated.versionHistory);
  });

  it('treats method revisions and same-name analyses as logical version series', () => {
    const current = createSeedWorkspace();
    const next = structuredClone(current);
    const experiment = next.experiments.find((item) => item.analyses.length > 0) ?? next.experiments[0];
    const method = experiment.methodRevisions.at(-1)!;
    experiment.methodRevisions.push({ ...method, id: 'method-next', version: method.version + 1, changeReason: 'Clarify procedure.', notes: `${method.notes} Clarified.`, createdAt: '2026-10-25T12:00:00.000Z' });
    if (experiment.analyses.length) {
      const analysis = experiment.analyses.at(-1)!;
      experiment.analyses.push({ ...structuredClone(analysis), id: 'analysis-next', revision: analysis.revision + 1, notes: `${analysis.notes} Updated.`, createdAt: '2026-10-25T12:00:00.000Z' });
    }

    const changes = planVersionChanges(current, next);
    expect(changes).toContainEqual(expect.objectContaining({ entityType: 'method', entityId: experiment.id, operation: 'updated' }));
    if (experiment.analyses.length > 1) expect(changes).toContainEqual(expect.objectContaining({ entityType: 'analysis', operation: 'updated' }));
    expect(changes.some((change) => change.entityType === 'method' && change.entityId === 'method-next')).toBe(false);
    expect(changes.some((change) => change.entityType === 'analysis' && change.entityId === 'analysis-next')).toBe(false);
  });
});
