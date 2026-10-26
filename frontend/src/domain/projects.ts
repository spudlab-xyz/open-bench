import type { ProjectStatus, Workspace } from '../types';

export interface ProjectDeletionImpact {
  experimentIds: string[];
  attachmentIds: string[];
  experiments: number;
  runs: number;
  measurements: number;
  attachments: number;
}

export const PROJECT_STATUSES: ProjectStatus[] = ['planned', 'active', 'on-hold', 'completed', 'archived'];

export const projectStatusLabel = (status: ProjectStatus) => ({
  planned: 'Planned',
  active: 'Active',
  'on-hold': 'On hold',
  completed: 'Completed',
  archived: 'Archived',
})[status];

export const projectStatusTone = (status: ProjectStatus): 'success' | 'warning' | 'info' | 'neutral' => ({
  planned: 'info' as const,
  active: 'success' as const,
  'on-hold': 'warning' as const,
  completed: 'neutral' as const,
  archived: 'neutral' as const,
})[status];

export function projectDeletionImpact(workspace: Workspace, projectId: string): ProjectDeletionImpact {
  const experiments = workspace.experiments.filter((experiment) => experiment.projectId === projectId);
  const attachmentIds = [...new Set(experiments.flatMap((experiment) => experiment.attachments.map((attachment) => attachment.id)))];
  return {
    experimentIds: experiments.map((experiment) => experiment.id),
    attachmentIds,
    experiments: experiments.length,
    runs: experiments.reduce((total, experiment) => total + experiment.runs.length, 0),
    measurements: experiments.reduce((total, experiment) => total + experiment.measurements.length, 0),
    attachments: attachmentIds.length,
  };
}

export function removeProject(workspace: Workspace, projectId: string): Workspace {
  return {
    ...workspace,
    projects: workspace.projects.filter((project) => project.id !== projectId),
    experiments: workspace.experiments.filter((experiment) => experiment.projectId !== projectId),
  };
}
