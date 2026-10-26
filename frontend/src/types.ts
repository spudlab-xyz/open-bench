export type ExperimentKind = 'thermal' | 'battery' | 'plant' | 'custom';
export type ExperimentStatus = 'planning' | 'in-progress' | 'complete';
export type RunStatus = 'planned' | 'running' | 'complete';
export type QualityStatus = 'valid' | 'review' | 'suspect' | 'invalid' | 'below-detection' | 'estimated';
export type ProjectStatus = 'planned' | 'active' | 'on-hold' | 'completed' | 'archived';
export type VersionOperation = 'created' | 'updated' | 'deleted';
export type VersionSource = 'user' | 'system';
export type ObservationKind = 'raw-observation' | 'corrected-observation' | 'derived' | 'estimate' | 'forecast';
export type ScientificValidationStatus = 'draft' | 'unvalidated' | 'validated' | 'superseded';
export type MethodValidationDecision = 'pending' | 'validated' | 'limited' | 'failed';
export type PermissionStatus = 'not-reviewed' | 'permitted' | 'restricted' | 'prohibited';
export type ReviewDecision = 'pending' | 'approved' | 'changes-requested' | 'rejected';
export type ReportReleaseStatus = 'draft' | 'reviewed' | 'released' | 'withdrawn';

export interface VersionRecord {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  version: number;
  operation: VersionOperation;
  reason: string;
  timestamp: string;
  source: VersionSource;
  snapshot: unknown;
}

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
  valueKind?: ObservationKind;
  precision?: number;
  detectionLimit?: number;
  uncertainty?: number;
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
  validationStatus?: ScientificValidationStatus;
  intendedUse?: string;
  useLimitations?: string;
  validationEvidenceIds?: string[];
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
  deviationImpact?: 'none' | 'unknown' | 'minor' | 'material';
  operator?: string;
  instrumentIds?: string[];
}

export interface DataSource {
  id: string;
  name: string;
  kind: 'manual' | 'csv' | 'instrument' | 'provider' | 'calculated' | 'legacy-unknown';
  provider?: string;
  datasetId?: string;
  stationId?: string;
  sourceUri?: string;
  retrievedAt?: string;
  licence?: string;
  attribution?: string;
  permissionStatus: PermissionStatus;
  permissionNote?: string;
}

export interface Instrument {
  id: string;
  name: string;
  sensorType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  resolution?: string;
  location?: string;
  notes?: string;
}

export interface CalibrationRecord {
  id: string;
  instrumentId: string;
  calibratedAt: string;
  validUntil?: string;
  procedure: string;
  result: 'passed' | 'limited' | 'failed' | 'unknown';
  coefficients?: string;
  responsiblePerson?: string;
  evidenceAttachmentIds: string[];
  notes?: string;
}

export interface MeasurementContext {
  sourceId?: string;
  sourceObservationId?: string;
  acquisitionMethod: 'manual' | 'csv' | 'instrument' | 'provider' | 'legacy-unknown';
  operator?: string;
  acquiredAt?: string;
  originalTimestamp?: string;
  timeZone?: string;
  clockAssumption?: string;
  instrumentId?: string;
  calibrationId?: string;
  samplingInterval?: string;
  collectionMethod?: string;
  location?: string;
  locationPrecision?: string;
}

export interface MeasurementValueMetadata {
  kind: ObservationKind;
  uncertainty?: number;
  precision?: number;
  detectionLimit?: number;
  missingReason?: 'not-collected' | 'instrument-failure' | 'not-applicable' | 'below-detection' | 'lost-sample' | 'unknown';
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
  affectedAnalysisIds?: string[];
  affectedConclusion?: boolean;
}

export interface Measurement {
  id: string;
  specimenId: string;
  runId: string;
  conditionId: string;
  /** Elapsed time in minutes. */
  elapsed?: number;
  observedAt?: string;
  values: Record<string, number | null>;
  quality: QualityStatus;
  notes: string;
  corrections: Correction[];
  revisions?: MeasurementRevision[];
  recordedAt: string;
  context?: MeasurementContext;
  valueMetadata?: Record<string, MeasurementValueMetadata>;
  qualityReason?: string;
  qualityReviewedBy?: string;
}

export interface MissingObservation {
  id: string;
  specimenId: string;
  runId: string;
  variableId: string;
  expectedPoint: number | string;
  reason: NonNullable<MeasurementValueMetadata['missingReason']>;
  notes?: string;
  recordedAt: string;
}

export interface ImportRecord {
  id: string;
  filename: string;
  importedAt: string;
  importedBy?: string;
  sourceId: string;
  fileHash: string;
  mapping: Record<string, string>;
  rawRows: Record<string, string>[];
  acceptedRows: number[];
  rejectedRows: Array<{ rowNumber: number; issues: string[] }>;
  permissionAcknowledged: boolean;
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
  algorithmId?: string;
  algorithmVersion?: string;
  applicationVersion?: string;
  formula?: string;
  aggregationRule?: string;
  includedMeasurementIds?: string[];
  roundingPolicy?: string;
  unitConversions?: string[];
  randomSeed?: string;
  referenceDataVersions?: string[];
  resultSnapshot?: Record<string, unknown>;
  resultChecksum?: string;
}

export interface ValidationEvidence {
  id: string;
  title: string;
  kind: 'example' | 'reference-dataset' | 'tool-comparison' | 'uncertainty-analysis' | 'hardware-test' | 'assumption-review';
  summary: string;
  result: 'supports-use' | 'limited' | 'failed' | 'not-reviewed';
  conditions: string;
  limitations: string;
  recordedAt: string;
  attachmentIds: string[];
}

export interface MethodValidationAssessment {
  id: string;
  methodRevisionIds: string[];
  procedureFingerprint: string;
  decision: MethodValidationDecision;
  reviewer: string;
  assessedAt: string;
  retrospective: boolean;
  intendedUse: string;
  limitations: string;
  evidenceIds: string[];
  rationale: string;
}

export interface ScientificReview {
  id: string;
  scope: 'experiment' | 'method' | 'analysis' | 'conclusion' | 'report';
  targetId: string;
  reviewer: string;
  decision: ReviewDecision;
  comments: string;
  reviewedAt: string;
  dataRevision: number;
}

export interface ConclusionEvidence {
  dataRevision: number;
  analysisId?: string;
  analysisRevision?: number;
  authoredBy?: string;
  authoredAt: string;
  methodRevisionIds?: string[];
}

export interface ReportRelease {
  id: string;
  status: ReportReleaseStatus;
  dataRevision: number;
  analysisId?: string;
  analysisRevision?: number;
  methodRevisionIds: string[];
  applicationVersion: string;
  releasedBy?: string;
  releasedAt: string;
  limitationsAcknowledged: boolean;
  unresolvedIssues: string[];
  checksum: string;
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
  intendedUse?: string;
  useLimitations?: string;
  sources?: DataSource[];
  instruments?: Instrument[];
  calibrations?: CalibrationRecord[];
  imports?: ImportRecord[];
  missingObservations?: MissingObservation[];
  validationEvidence?: ValidationEvidence[];
  methodValidationAssessments?: MethodValidationAssessment[];
  scientificReviews?: ScientificReview[];
  conclusionEvidence?: ConclusionEvidence;
  reportReleases?: ReportRelease[];
}

export interface Workspace {
  schemaVersion: 4;
  seedVersion: number;
  projects: Project[];
  experiments: Experiment[];
  savedMethods: MethodRevision[];
  versionHistory: VersionRecord[];
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
