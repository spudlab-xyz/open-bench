import { AlertTriangle, ArrowRight, Calendar, ClipboardList, FlaskConical, Layers3, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExperimentChart } from '../../components/ExperimentChart';
import { ScientificRecordPanel } from '../../components/ScientificRecordPanel';
import { Metric, Panel, SortableHeader, StatusBadge, useSortableRows } from '../../components/ui';
import type { Run } from '../../types';
import { formatDateTime } from '../../utils/files';
import { formatLabelWithUnit } from '../../utils/units';
import type { ExperimentTabProps } from './ExperimentPage';

export function OverviewTab({ experiment }: ExperimentTabProps) {
  const variable = experiment.variables.find((item) => item.role === 'outcome');
  const latestMethod = experiment.methodRevisions.at(-1);
  const planningGaps = [!experiment.question && 'Research question', !experiment.variedFactor && 'Varied factor', !experiment.measuredOutcome && 'Measured outcome', variable && !variable.unit.trim() && 'Measurement unit', !experiment.schedule && 'Measurement schedule'].filter(Boolean);
  type SortKey = 'execution' | 'specimen' | 'date' | 'status' | 'readings';
  const recentRuns = [...experiment.runs].sort((left, right) => right.startedAt.localeCompare(left.startedAt)).slice(0, 5);
  const runSort = useSortableRows<Run, SortKey>(recentRuns, 'date', (run, key) => {
    if (key === 'execution') return run.name;
    if (key === 'specimen') return run.specimenIds.map((id) => experiment.specimens.find((item) => item.id === id)?.name).join(', ');
    if (key === 'date') return run.startedAt;
    if (key === 'status') return run.status;
    return experiment.measurements.filter((item) => item.runId === run.id).length;
  }, 'desc');
  const header = (key: SortKey, label: string, numeric = false) => <SortableHeader active={runSort.sort.key === key} direction={runSort.sort.direction} onSort={() => runSort.sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  return <div className="overview-grid">
    {planningGaps.length > 0 && <div className="planning-notice span-all"><AlertTriangle /><span><strong>Planning can continue while data is captured.</strong> Missing: {planningGaps.join(', ')}. These are planning gaps, not invalid measurements.</span></div>}
    <div className="span-all"><ScientificRecordPanel experiment={experiment} /></div>
    <div className="metric-grid span-all"><Metric value={experiment.runs.length} label="procedure executions" /><Metric value={experiment.conditions.length} label="conditions" /><Metric value={experiment.measurements.length} label="readings" /><Metric value={experiment.specimens.length} label="physical specimens" /></div>
    <div className="overview-main">
      <Panel title={<h2>Question</h2>}><p className="question-text">{experiment.question || 'No research question recorded yet.'}</p><p className="muted"><strong>{experiment.exploratory ? 'Exploratory:' : 'Hypothesis:'}</strong> {experiment.exploratory ? 'No directional hypothesis was set.' : experiment.hypothesis || 'Not recorded.'}</p></Panel>
      {variable && <Panel className="chart-panel" title={<h2>Observed {variable.name.toLowerCase()}</h2>} action={<Link className="text-link" to={`/experiments/${experiment.id}/analysis`}>Open analysis <ArrowRight size={15} /></Link>}><ExperimentChart experiment={experiment} variableId={variable.id} /></Panel>}
      <Panel title={<h2>Recent runs</h2>} action={<Link className="text-link" to={`/experiments/${experiment.id}/runs`}>View all <ArrowRight size={15} /></Link>}><div className="table-scroll"><table><thead><tr>{header('execution', 'Execution')}{header('specimen', 'Specimen')}{header('date', 'Started')}{header('status', 'Status')}{header('readings', 'Readings', true)}</tr></thead><tbody>{runSort.rows.map((run) => <tr key={run.id}><td><Link className="text-link recent-run-link" to={`/experiments/${experiment.id}/runs/${run.id}`}><strong>{run.name}</strong><ArrowRight size={14} /></Link>{run.cycle && run.cycle > 1 && <small className="block">Cycle {run.cycle} · same specimen</small>}</td><td>{run.specimenIds.map((id) => experiment.specimens.find((item) => item.id === id)?.name).join(', ')}</td><td>{formatDateTime(run.startedAt)}</td><td><StatusBadge tone={run.status === 'complete' ? 'success' : 'info'}>{run.status}</StatusBadge></td><td className="numeric">{experiment.measurements.filter((item) => item.runId === run.id).length}</td></tr>)}</tbody></table></div></Panel>
    </div>
    <aside className="overview-side"><Panel title={<h2>Experiment details</h2>}><dl className="detail-list"><div><dt>Factor</dt><dd>{experiment.variedFactor || 'Not recorded'}</dd></div><div><dt>Outcome</dt><dd>{experiment.measuredOutcome ? formatLabelWithUnit(experiment.measuredOutcome, variable?.unit) : 'Not recorded'}</dd></div><div><dt>Created</dt><dd>{formatDateTime(experiment.createdAt)}</dd></div><div><dt>Data revision</dt><dd>{experiment.dataRevision}</dd></div>{experiment.sourceExperimentId && <div><dt>Source</dt><dd>{experiment.sourceExperimentId}</dd></div>}</dl></Panel>
      <Panel title={<h2>Design</h2>}><div className="icon-detail"><Layers3 /><span><strong>{experiment.conditions.length} conditions</strong><small>{experiment.conditions.map((item) => item.name).join(', ')}</small></span></div><div className="icon-detail"><FlaskConical /><span><strong>{experiment.specimens.length} physical specimens</strong><small>Assignments are recorded independently from runs.</small></span></div><div className="icon-detail"><PlayCircle /><span><strong>{experiment.runs.length} executions</strong><small>Repeated runs do not imply independent specimens.</small></span></div></Panel>
      <Panel title={<h2>Method {latestMethod ? `v${latestMethod.version}` : ''}</h2>}>{latestMethod ? <><div className="icon-detail"><ClipboardList /><span><strong>{latestMethod.title}</strong><small>{latestMethod.steps.length} ordered steps</small></span></div><ol className="method-steps compact">{latestMethod.steps.slice(0, 4).map((step, index) => <li key={index}>{step}</li>)}</ol></> : <p className="muted">No method recorded.</p>}</Panel>
      <Panel title={<h2>Schedule</h2>}><div className="icon-detail"><Calendar /><span>{experiment.schedule || 'Not recorded'}</span></div></Panel>
    </aside>
  </div>;
}
