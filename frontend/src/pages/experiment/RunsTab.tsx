import { ArrowRight, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RunEditorModal } from '../../components/RunEditorModal';
import { Button, EmptyState, Panel, SortableHeader, StatusBadge, useSortableRows } from '../../components/ui';
import { VersionAuditButton } from '../../components/VersionAudit';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Run } from '../../types';
import { formatDateTime } from '../../utils/files';
import type { ExperimentTabProps } from './ExperimentPage';

export function RunsTab({ experiment }: ExperimentTabProps) {
  const { updateExperiment } = useWorkspace();
  const [runModal, setRunModal] = useState<Run | 'new' | null>(null);
  type SortKey = 'run' | 'specimens' | 'method' | 'started' | 'status' | 'readings' | 'deviation';
  const runSort = useSortableRows<Run, SortKey>(experiment.runs, 'started', (run, key) => {
    if (key === 'run') return run.name;
    if (key === 'specimens') return run.specimenIds.map((id) => experiment.specimens.find((item) => item.id === id)?.name).join(', ');
    if (key === 'method') return experiment.methodRevisions.find((item) => item.id === run.methodRevisionId)?.version;
    if (key === 'started') return run.startedAt;
    if (key === 'status') return run.status;
    if (key === 'readings') return experiment.measurements.filter((item) => item.runId === run.id).length;
    return run.deviations;
  }, 'desc');
  const header = (key: SortKey, label: string, numeric = false) => <SortableHeader active={runSort.sort.key === key} direction={runSort.sort.direction} onSort={() => runSort.sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  const completeRun = (id: string) => void updateExperiment(experiment.id, (current) => ({ ...current, runs: current.runs.map((run) => run.id === id ? { ...run, status: 'complete', completedAt: new Date().toISOString() } : run), updatedAt: new Date().toISOString() }), { systemReason: 'Procedure execution marked complete by the completion action.' });
  return <div className="runs-layout"><Panel title={<div><h2>Procedure executions</h2><p className="panel-subtitle">Each run records one execution against existing physical specimens. Repeated observations remain measurements within that run.</p></div>} action={<Button variant="primary" disabled={!experiment.specimens.length || !experiment.methodRevisions.length} onClick={() => setRunModal('new')}><Plus size={16} /> Add run</Button>}>
    {!experiment.specimens.length ? <EmptyState title="Add specimens before creating a run" action={<Link to={`/experiments/${experiment.id}/specimens`}><Button>Open specimens</Button></Link>}>Runs associate an execution with one or more physical specimens or groups.</EmptyState> : experiment.runs.length ? <div className="table-scroll"><table><thead><tr>{header('run', 'Run')}{header('specimens', 'Specimens')}{header('method', 'Method')}{header('started', 'Started')}{header('status', 'Status')}{header('readings', 'Readings', true)}{header('deviation', 'Deviation')}<th>Version and actions</th></tr></thead><tbody>{runSort.rows.map((run) => <tr key={run.id}><td><Link className="run-detail-link" to={`/experiments/${experiment.id}/runs/${run.id}`}><span><strong>{run.name}</strong>{(run.cycle ?? 1) > 1 && <small className="block warning-text">Cycle {run.cycle}; same specimen</small>}</span><ArrowRight /></Link></td><td>{run.specimenIds.map((id) => experiment.specimens.find((item) => item.id === id)?.name).join(', ')}</td><td>v{experiment.methodRevisions.find((item) => item.id === run.methodRevisionId)?.version}</td><td>{formatDateTime(run.startedAt)}</td><td><StatusBadge tone={run.status === 'complete' ? 'success' : 'info'}>{run.status}</StatusBadge></td><td className="numeric">{experiment.measurements.filter((item) => item.runId === run.id).length}</td><td>{run.deviations || 'None recorded'}</td><td><span className="inline-audit-actions"><VersionAuditButton entityType="run" entityId={run.id} label={run.name} compact /><Button variant="ghost" onClick={() => setRunModal(run)}><Pencil size={16} /> Edit</Button>{run.status !== 'complete' && <Button variant="ghost" onClick={() => completeRun(run.id)}><CheckCircle2 size={16} /> Complete</Button>}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No runs yet">Create a procedure execution and associate the specimens that took part.</EmptyState>}
  </Panel>
  {runModal && <RunEditorModal experiment={experiment} run={runModal === 'new' ? undefined : runModal} onClose={() => setRunModal(null)} />}
  </div>;
}
