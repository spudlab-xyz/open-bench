import type { ProjectStatus } from '../types';

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
