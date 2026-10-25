import { ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Field, Modal, Panel, SortableHeader, StatusBadge, useSortableRows } from '../../components/ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Run } from '../../types';
import { formatDateTime, uid } from '../../utils/files';
import type { ExperimentTabProps } from './ExperimentPage';

export function RunsTab({ experiment }: ExperimentTabProps) {
  const { updateExperiment } = useWorkspace();
  const [runModal, setRunModal] = useState(false);
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
  const saveRun = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const specimenIds = data.getAll('specimens').map(String);
    if (!specimenIds.length) return;
    const run: Run = {
      id: uid('run'),
      name: String(data.get('name')),
      specimenIds,
      methodRevisionId: String(data.get('method')),
      startedAt: new Date(String(data.get('date'))).toISOString(),
      status: String(data.get('status')) as Run['status'],
      cycle: Number(data.get('cycle')) || 1,
      deviations: String(data.get('deviations')),
    };
    if (run.status === 'complete') run.completedAt = new Date().toISOString();
    if (await updateExperiment(experiment.id, (current) => ({ ...current, runs: [...current.runs, run], status: current.status === 'planning' ? 'in-progress' : current.status, updatedAt: new Date().toISOString() }))) setRunModal(false);
  };
  const completeRun = (id: string) => void updateExperiment(experiment.id, (current) => ({ ...current, runs: current.runs.map((run) => run.id === id ? { ...run, status: 'complete', completedAt: new Date().toISOString() } : run), updatedAt: new Date().toISOString() }));
  return <div className="runs-layout"><Panel title={<div><h2>Procedure executions</h2><p className="panel-subtitle">Each run records one execution against existing physical specimens. Repeated observations remain measurements within that run.</p></div>} action={<Button variant="primary" disabled={!experiment.specimens.length || !experiment.methodRevisions.length} onClick={() => setRunModal(true)}><Plus size={16} /> Add run</Button>}>
    {!experiment.specimens.length ? <EmptyState title="Add specimens before creating a run" action={<Link to={`/experiments/${experiment.id}/specimens`}><Button>Open specimens</Button></Link>}>Runs associate an execution with one or more physical specimens or groups.</EmptyState> : experiment.runs.length ? <div className="table-scroll"><table><thead><tr>{header('run', 'Run')}{header('specimens', 'Specimens')}{header('method', 'Method')}{header('started', 'Started')}{header('status', 'Status')}{header('readings', 'Readings', true)}{header('deviation', 'Deviation')}<th>Actions</th></tr></thead><tbody>{runSort.rows.map((run) => <tr key={run.id}><td><Link className="run-detail-link" to={`/experiments/${experiment.id}/runs/${run.id}`}><span><strong>{run.name}</strong>{(run.cycle ?? 1) > 1 && <small className="block warning-text">Cycle {run.cycle}; same specimen</small>}</span><ArrowRight /></Link></td><td>{run.specimenIds.map((id) => experiment.specimens.find((item) => item.id === id)?.name).join(', ')}</td><td>v{experiment.methodRevisions.find((item) => item.id === run.methodRevisionId)?.version}</td><td>{formatDateTime(run.startedAt)}</td><td><StatusBadge tone={run.status === 'complete' ? 'success' : 'info'}>{run.status}</StatusBadge></td><td className="numeric">{experiment.measurements.filter((item) => item.runId === run.id).length}</td><td>{run.deviations || 'None recorded'}</td><td>{run.status !== 'complete' && <Button variant="ghost" onClick={() => completeRun(run.id)}><CheckCircle2 size={16} /> Complete</Button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No runs yet">Create a procedure execution and associate the specimens that took part.</EmptyState>}
  </Panel>
  {runModal && <Modal title="Add procedure execution" onClose={() => setRunModal(false)} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void saveRun(event.currentTarget); }}><div className="form-grid"><Field label="Run identity"><input name="name" required defaultValue={`Run ${experiment.runs.length + 1}`} /></Field><Field label="Start date and time"><input name="date" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} /></Field><Field label="Method revision"><select name="method">{experiment.methodRevisions.map((method) => <option key={method.id} value={method.id}>v{method.version} — {method.title}</option>)}</select></Field><Field label="Status"><select name="status"><option value="planned">Planned</option><option value="running">Running</option><option value="complete">Complete</option></select></Field><Field label="Cycle number" hint="Use this to identify repeated cycles on the same specimen."><input name="cycle" type="number" min="1" defaultValue="1" /></Field></div><fieldset><legend>Associated specimens</legend><div className="check-grid">{experiment.specimens.map((specimen) => <label className="check-row simple" key={specimen.id}><input type="checkbox" name="specimens" value={specimen.id} /><span>{specimen.name}<small>{experiment.conditions.find((item) => item.id === specimen.conditionId)?.name}</small></span></label>)}</div></fieldset><Field label="Execution-specific deviations"><textarea name="deviations" rows={3} placeholder="Record deviations from the selected method revision." /></Field><div className="form-actions"><Button type="button" onClick={() => setRunModal(false)}>Cancel</Button><Button variant="primary" type="submit">Add run</Button></div></form></Modal>}
  </div>;
}
