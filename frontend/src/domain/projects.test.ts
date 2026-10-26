import { describe, expect, it } from 'vitest';
import { createSeedWorkspace } from '../data/seed';
import { appendVersionHistory, planVersionChanges, versionRecordsForEntity } from './versioning';
import { projectDeletionImpact, removeProject } from './projects';

describe('project deletion', () => {
  it('removes the project and its active experiments without changing unrelated records', () => {
    const current = createSeedWorkspace();
    const project = current.projects[0];
    const deletedExperiments = current.experiments.filter((experiment) => experiment.projectId === project.id);
    deletedExperiments[0].attachments.push({ id: 'project-delete-attachment', name: 'evidence.txt', type: 'text/plain', size: 8, caption: 'Evidence', createdAt: '2026-10-26T12:00:00.000Z' });
    const unrelatedProjects = current.projects.filter((item) => item.id !== project.id);
    const unrelatedExperiments = current.experiments.filter((experiment) => experiment.projectId !== project.id);
    const savedMethods = structuredClone(current.savedMethods);

    const impact = projectDeletionImpact(current, project.id);
    const next = removeProject(current, project.id);

    expect(impact).toMatchObject({
      experiments: deletedExperiments.length,
      runs: deletedExperiments.reduce((total, experiment) => total + experiment.runs.length, 0),
      measurements: deletedExperiments.reduce((total, experiment) => total + experiment.measurements.length, 0),
      attachments: 1,
    });
    expect(impact.attachmentIds).toEqual(['project-delete-attachment']);
    expect(next.projects).toEqual(unrelatedProjects);
    expect(next.experiments).toEqual(unrelatedExperiments);
    expect(next.experiments.every((experiment) => next.projects.some((item) => item.id === experiment.projectId))).toBe(true);
    expect(next.savedMethods).toEqual(savedMethods);
  });

  it('retains deletion tombstones for the project, experiments, and nested records', () => {
    const current = createSeedWorkspace();
    const project = current.projects[0];
    const experiment = current.experiments.find((item) => item.projectId === project.id)!;
    const measurement = experiment.measurements[0];
    const next = removeProject(current, project.id);
    const changes = planVersionChanges(current, next);

    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'project', entityId: project.id, operation: 'deleted' }),
      expect.objectContaining({ entityType: 'experiment', entityId: experiment.id, operation: 'deleted' }),
      expect.objectContaining({ entityType: 'measurement', entityId: measurement.id, operation: 'deleted' }),
    ]));

    const versioned = appendVersionHistory(next, changes, 'Project is no longer required.', 'user', '2026-10-26T17:00:00.000Z');
    expect(versionRecordsForEntity(versioned, 'project', project.id).at(-1)).toMatchObject({ version: 2, operation: 'deleted', reason: 'Project is no longer required.' });
    expect(versionRecordsForEntity(versioned, 'experiment', experiment.id).at(-1)).toMatchObject({ version: 2, operation: 'deleted' });
    expect(versionRecordsForEntity(versioned, 'measurement', measurement.id).at(-1)).toMatchObject({ version: 2, operation: 'deleted' });
  });
});
