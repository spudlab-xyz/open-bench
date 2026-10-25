import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createSeedWorkspace, upgradeSeedWorkspace } from './seed';
import { IndexedDbWorkspaceRepository } from './repository';

describe('IndexedDB workspace repository', () => {
  it('persists workspace changes and attachment bytes', async () => {
    const repository = new IndexedDbWorkspaceRepository(`openbench-test-${crypto.randomUUID()}`);
    const workspace = createSeedWorkspace();
    workspace.experiments[0].title = 'Persisted title';
    await repository.save(workspace);
    expect((await repository.load())?.experiments[0].title).toBe('Persisted title');

    const blob = new Blob(['image-bytes'], { type: 'image/png' });
    await repository.saveAttachment({ id: 'attachment-1', experimentId: 'exp-thermal', blob });
    expect(await (await repository.loadAttachment('attachment-1'))!.blob.text()).toBe('image-bytes');
  });

  it('reset replaces changed content instead of reseeding on every load', async () => {
    const repository = new IndexedDbWorkspaceRepository(`openbench-test-${crypto.randomUUID()}`);
    const changed = createSeedWorkspace();
    changed.experiments = [];
    await repository.save(changed);
    expect((await repository.load())?.experiments).toHaveLength(0);
    await repository.reset(createSeedWorkspace());
    expect((await repository.load())?.experiments).toHaveLength(4);
  });

  it('adds the new seeded project example without overwriting user changes', () => {
    const oldWorkspace = createSeedWorkspace();
    oldWorkspace.seedVersion = 1;
    oldWorkspace.experiments = oldWorkspace.experiments.filter((item) => item.id !== 'exp-surface');
    oldWorkspace.experiments[0].title = 'User-edited title';
    const upgraded = upgradeSeedWorkspace(oldWorkspace);
    expect(upgraded.experiments.find((item) => item.id === 'exp-thermal')?.title).toBe('User-edited title');
    expect(upgraded.experiments.find((item) => item.id === 'exp-surface')).toBeDefined();
  });

  it('adds project lifecycle metadata without overwriting legacy project details', () => {
    const oldWorkspace = createSeedWorkspace();
    oldWorkspace.seedVersion = 2;
    oldWorkspace.projects[0].name = 'User-edited project';
    const legacyProjects = oldWorkspace.projects.map(({ status: _status, createdAt: _createdAt, updatedAt: _updatedAt, lifecycleEvents: _lifecycleEvents, ...project }) => project);
    oldWorkspace.projects = legacyProjects as typeof oldWorkspace.projects;
    const upgraded = upgradeSeedWorkspace(oldWorkspace);
    expect(upgraded.seedVersion).toBe(3);
    expect(upgraded.projects[0].name).toBe('User-edited project');
    expect(upgraded.projects[0].status).toBe('active');
    expect(upgraded.projects[0].lifecycleEvents).toHaveLength(1);
    expect(upgraded.projects[0].lifecycleEvents[0].note).toContain('initialised');
    expect(upgraded.experiments).toHaveLength(oldWorkspace.experiments.length);
  });
});
