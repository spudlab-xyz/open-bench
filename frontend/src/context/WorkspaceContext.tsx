import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createSeedWorkspace, SEED_VERSION, upgradeSeedWorkspace } from '../data/seed';
import { IndexedDbWorkspaceRepository } from '../data/repository';
import type { AttachmentRecord, Experiment, Workspace, WorkspaceRepository } from '../types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface WorkspaceContextValue {
  workspace: Workspace | null;
  loading: boolean;
  saveState: SaveState;
  storageError: string | null;
  commit: (change: (workspace: Workspace) => Workspace) => Promise<boolean>;
  updateExperiment: (id: string, change: (experiment: Experiment) => Experiment) => Promise<boolean>;
  resetDemo: () => Promise<boolean>;
  saveAttachment: (record: AttachmentRecord) => Promise<void>;
  loadAttachment: (id: string) => Promise<AttachmentRecord | null>;
  deleteAttachment: (id: string) => Promise<void>;
  clearError: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const defaultRepository = new IndexedDbWorkspaceRepository();

export function WorkspaceProvider({ children, repository = defaultRepository }: { children: ReactNode; repository?: WorkspaceRepository }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const workspaceRef = useRef<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [storageError, setStorageError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let stored = await repository.load();
        if (!stored) {
          stored = createSeedWorkspace();
          await repository.save(stored);
        } else if (stored.seedVersion < SEED_VERSION) {
          stored = upgradeSeedWorkspace(stored);
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

  const commit = useCallback((change: (current: Workspace) => Workspace): Promise<boolean> => {
    const operation = queue.current.then(async () => {
      const current = workspaceRef.current;
      if (!current) throw new Error('Workspace is not available.');
      setSaveState('saving');
      const next = change(structuredClone(current));
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
  }, [repository]);

  const updateExperiment = useCallback((id: string, change: (experiment: Experiment) => Experiment) => commit((current) => ({
    ...current,
    experiments: current.experiments.map((experiment) => experiment.id === id ? change(experiment) : experiment),
  })), [commit]);

  const resetDemo = useCallback(async () => {
    try {
      setSaveState('saving');
      const seed = createSeedWorkspace();
      await repository.reset(seed);
      workspaceRef.current = seed;
      setWorkspace(seed);
      setSaveState('saved');
      setStorageError(null);
      return true;
    } catch (error) {
      setSaveState('error');
      setStorageError(error instanceof Error ? error.message : 'OpenBench could not reset browser storage.');
      return false;
    }
  }, [repository]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace, loading, saveState, storageError, commit, updateExperiment, resetDemo,
    saveAttachment: (record) => repository.saveAttachment(record),
    loadAttachment: (id) => repository.loadAttachment(id),
    deleteAttachment: (id) => repository.deleteAttachment(id),
    clearError: () => setStorageError(null),
  }), [workspace, loading, saveState, storageError, commit, updateExperiment, resetDemo, repository]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider.');
  return context;
}
