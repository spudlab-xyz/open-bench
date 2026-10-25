export type ExperimentKind = 'thermal' | 'battery' | 'plant' | 'custom';
export type ExperimentStatus = 'planning' | 'in-progress' | 'complete';
export type RunStatus = 'planned' | 'running' | 'complete';
export type QualityStatus = 'valid' | 'review';
export type ProjectStatus = 'planned' | 'active' | 'on-hold' | 'completed' | 'archived';

export interface ProjectLifecycleEvent {
  id: string;
  status: ProjectStatus;
  changedAt: string;
  note: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  colour: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lifecycleEvents: ProjectLifecycleEvent[];
}

export interface VariableDefinition {
  id: string;
  name: string;
  unit: string;
  role: 'outcome' | 'context';
}

export interface Condition {
  id: string;
  name: string;
  description: string;
  colour: string;
}

export interface MethodRevision {
  id: string;
  version: number;
  basedOnRevisionId?: string;
  changeReason?: string;
  title: string;
  steps: string[];
  equipment: string;
  notes: string;
  createdAt: string;
}

export interface Specimen {
  id: string;
  name: string;
  conditionId: string;
  experimentalUnit?: string;
  notes: string;
}

export interface Run {
  id: string;
  name: string;
  specimenIds: string[];
  methodRevisionId: string;
  startedAt: string;
  completedAt?: string;
  status: RunStatus;
  cycle?: number;
  deviations: string;
}

export interface Correction {
  id: string;
  variableId: string;
  previousValue: number;
  replacementValue: number;
  reason: string;
  timestamp: string;
}

export interface MeasurementSnapshot {
  values: Record<string, number | null>;
  quality: QualityStatus;
  notes: string;
}

export interface MeasurementRevision {
  id: string;
  revision: number;
  reason: string;
  timestamp: string;
  before: MeasurementSnapshot;
  after: MeasurementSnapshot;
}

export interface Measurement {
  id: string;
  specimenId: string;
  runId: string;
  conditionId: string;
  elapsed?: number;
  observedAt?: string;
  values: Record<string, number | null>;
  quality: QualityStatus;
  notes: string;
  corrections: Correction[];
  revisions?: MeasurementRevision[];
  recordedAt: string;
}

export interface AnalysisExclusion {
  measurementId: string;
  reason: string;
}

export interface AnalysisSettings {
  variableId: string;
  comparison: 'observed' | 'change';
  selectedPoint: number | string;
  baselinePoint?: number | string;
  conditionIds: string[];
  specimenIds: string[];
  runIds: string[];
  showTrajectories: boolean;
  chartType: 'line' | 'scatter' | 'comparison';
}

export interface SavedAnalysis {
  id: string;
  name: string;
  revision: number;
  sourceDataRevision: number;
  createdAt: string;
  settings: AnalysisSettings;
  exclusions: AnalysisExclusion[];
  notes: string;
}

export interface ExperimentNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  caption: string;
  createdAt: string;
}

export interface Experiment {
  id: string;
  sourceExperimentId?: string;
  importProvenance?: string;
  kind: ExperimentKind;
  code: string;
  projectId: string;
  title: string;
  description: string;
  question: string;
  hypothesis?: string;
  exploratory: boolean;
  variedFactor: string;
  measuredOutcome: string;
  controls: string;
  schedule: string;
  status: ExperimentStatus;
  conditions: Condition[];
  variables: VariableDefinition[];
  methodRevisions: MethodRevision[];
  specimens: Specimen[];
  runs: Run[];
  measurements: Measurement[];
  analyses: SavedAnalysis[];
  notes: ExperimentNote[];
  attachments: AttachmentMeta[];
  conclusion: string;
  limitations: string;
  followUp: string;
  dataRevision: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  schemaVersion: 1;
  seedVersion: number;
  projects: Project[];
  experiments: Experiment[];
  savedMethods: MethodRevision[];
}

export interface AttachmentRecord {
  id: string;
  experimentId: string;
  blob: Blob;
}

export interface WorkspaceRepository {
  load(): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
  reset(workspace: Workspace): Promise<void>;
  saveAttachment(record: AttachmentRecord): Promise<void>;
  loadAttachment(id: string): Promise<AttachmentRecord | null>;
  deleteAttachment(id: string): Promise<void>;
}
