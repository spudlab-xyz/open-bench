import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createSeedWorkspace, SEED_VERSION, upgradeSeedWorkspace } from '../data/seed';
import { IndexedDbWorkspaceRepository } from '../data/repository';
import { appendVersionHistory, changeRequiresReason, initialiseVersionHistory, planVersionChanges } from '../domain/versioning';
import { upgradeScientificWorkspace } from '../domain/scientific';
import type { AttachmentRecord, Experiment, VersionSource, Workspace, WorkspaceRepository } from '../types';
import { Button, Field, Modal } from '../components/ui';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface WorkspaceContextValue {
  workspace: Workspace | null;
  loading: boolean;
  saveState: SaveState;
  storageError: string | null;
  commit: (change: (workspace: Workspace) => Workspace, options?: MutationOptions) => Promise<boolean>;
  updateExperiment: (id: string, change: (experiment: Experiment) => Experiment, options?: MutationOptions) => Promise<boolean>;
  resetDemo: () => Promise<boolean>;
  saveAttachment: (record: AttachmentRecord) => Promise<void>;
  loadAttachment: (id: string) => Promise<AttachmentRecord | null>;
  deleteAttachment: (id: string) => Promise<void>;
  clearError: () => void;
}

export interface MutationOptions {
  reason?: string;
  systemReason?: string;
}

interface ReasonRequest {
  summary: string;
  resolve: (reason: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const defaultRepository = new IndexedDbWorkspaceRepository();

export function WorkspaceProvider({ children, repository = defaultRepository }: { children: ReactNode; repository?: WorkspaceRepository }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const workspaceRef = useRef<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [reasonRequest, setReasonRequest] = useState<ReasonRequest | null>(null);
  const [reasonDraft, setReasonDraft] = useState('');
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let stored = await repository.load();
        if (!stored) {
          stored = createSeedWorkspace();
          await repository.save(stored);
        } else if (stored.seedVersion < SEED_VERSION || stored.schemaVersion < 4 || !('versionHistory' in stored)) {
          const beforeMigration = stored;
          const seeded = stored.seedVersion < SEED_VERSION ? upgradeSeedWorkspace(stored) : stored;
          const upgraded = upgradeScientificWorkspace(seeded);
          stored = 'versionHistory' in beforeMigration && beforeMigration.versionHistory?.length
            ? appendVersionHistory(upgraded, planVersionChanges(beforeMigration, upgraded), 'Workspace migrated to schema v4 with independent method-validation assessments and conservative legacy defaults.', 'system', new Date().toISOString())
            : initialiseVersionHistory(upgraded);
          await repository.save(stored);
        }
        if (active) {
          workspaceRef.current = stored;
          setWorkspace(stored);
          setSaveState('saved');
        }
      } catch (error) {
        if (active) {
          setStorageError(error instanceof Error ? error.message : 'OpenBench could not read browser storage.');
          setSaveState('error');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [repository]);

  const requestReason = useCallback((summary: string): Promise<string | null> => new Promise((resolve) => {
    setReasonDraft('');
    setReasonRequest({ summary, resolve });
  }), []);

  const commit = useCallback((change: (current: Workspace) => Workspace, options: MutationOptions = {}): Promise<boolean> => {
    const operation = queue.current.then(async () => {
      const current = workspaceRef.current;
      if (!current) throw new Error('Workspace is not available.');
      const candidate = change(structuredClone(current));
      const changes = planVersionChanges(current, candidate);
      if (!changes.length) return true;
      const changedExisting = changes.filter((item) => changeRequiresReason(current, item));
      let reason = options.reason?.trim() || options.systemReason?.trim() || '';
      let source: VersionSource = options.systemReason ? 'system' : 'user';
      if (changedExisting.length && !reason) {
        const labels = changedExisting.slice(0, 3).map((item) => item.entityLabel).join(', ');
        reason = (await requestReason(`${changedExisting.length} existing item${changedExisting.length === 1 ? '' : 's'} will receive a new version${labels ? `: ${labels}${changedExisting.length > 3 ? ', …' : ''}` : ''}.`))?.trim() ?? '';
        if (!reason) return false;
        source = 'user';
      }
      setSaveState('saving');
      const next = appendVersionHistory(candidate, changes, reason, source, new Date().toISOString());
      await repository.save(next);
      workspaceRef.current = next;
      setWorkspace(next);
      setSaveState('saved');
      setStorageError(null);
      return true;
    }).catch((error) => {
      setSaveState('error');
      setStorageError(error instanceof Error ? error.message : 'OpenBench could not save to this browser.');
      return false;
    });
    queue.current = operation.then(() => undefined);
    return operation;
  }, [repository, requestReason]);

  const updateExperiment = useCallback((id: string, change: (experiment: Experiment) => Experiment, options?: MutationOptions) => commit((current) => ({
    ...current,
    experiments: current.experiments.map((experiment) => experiment.id === id ? change(experiment) : experiment),
  }), options), [commit]);

  const resetDemo = useCallback((): Promise<boolean> => {
    const operation = queue.current.then(async () => {
      setSaveState('saving');
      const current = workspaceRef.current;
      const seed = createSeedWorkspace();
      const changes = current ? planVersionChanges(current, seed) : [];
      const reset = current ? appendVersionHistory({ ...seed, versionHistory: current.versionHistory }, changes, 'Demo workspace reset', 'system', new Date().toISOString()) : seed;
      await repository.reset(reset);
      workspaceRef.current = reset;
      setWorkspace(reset);
      setSaveState('saved');
      setStorageError(null);
      return true;
    }).catch((error) => {
      setSaveState('error');
      setStorageError(error instanceof Error ? error.message : 'OpenBench could not reset browser storage.');
      return false;
    });
    queue.current = operation.then(() => undefined);
    return operation;
  }, [repository]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace, loading, saveState, storageError, commit, updateExperiment, resetDemo,
    saveAttachment: (record) => repository.saveAttachment(record),
    loadAttachment: (id) => repository.loadAttachment(id),
    deleteAttachment: (id) => repository.deleteAttachment(id),
    clearError: () => setStorageError(null),
  }), [workspace, loading, saveState, storageError, commit, updateExperiment, resetDemo, repository]);

  const closeReason = (reason: string | null) => {
    reasonRequest?.resolve(reason);
    setReasonRequest(null);
    setReasonDraft('');
  };

  return <WorkspaceContext.Provider value={value}>{children}{reasonRequest && <Modal title="Reason for this change" onClose={() => closeReason(null)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (reasonDraft.trim()) closeReason(reasonDraft.trim()); }}><p>{reasonRequest.summary}</p><p className="muted">The reason, timestamp, and resulting version numbers will be retained in the permanent history.</p><Field label="Change reason"><textarea autoFocus rows={4} required value={reasonDraft} onChange={(event) => setReasonDraft(event.target.value)} placeholder="Why is this change being made?" /></Field><div className="form-actions"><Button type="button" onClick={() => closeReason(null)}>Cancel change</Button><Button variant="primary" type="submit" disabled={!reasonDraft.trim()}>Save new version</Button></div></form></Modal>}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider.');
  return context;
}
