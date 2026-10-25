import { ArrowLeft, Beaker, CalendarDays, CheckCircle2, Clock3, FileText, FlaskConical, Gauge, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ExperimentChart } from '../../components/ExperimentChart';
import { Button, Metric, Panel, SortableHeader, StatusBadge } from '../../components/ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { AnalysisSettings } from '../../types';
import { formatDateTime } from '../../utils/files';

const tabs = ['overview', 'method', 'specimens', 'runs', 'data', 'analysis', 'report'] as const;
type ReadingSortKey = 'point' | 'specimen' | 'condition' | 'quality' | 'notes' | `variable:${string}`;

export function RunDetailPage() {
  const { id, runId } = useParams();
  const { workspace, updateExperiment } = useWorkspace();
  const [readingSort, setReadingSort] = useState<{ key: ReadingSortKey; direction: 'asc' | 'desc' }>({ key: 'point', direction: 'asc' });
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [runId]);
  if (!workspace) return null;
  const experiment = workspace.experiments.find((item) => item.id === id);
  if (!experiment) return <Navigate to="/experiments" replace />;
  const run = experiment.runs.find((item) => item.id === runId);
  if (!run) return <Navigate to={`/experiments/${experiment.id}/runs`} replace />;
  const project = workspace.projects.find((item) => item.id === experiment.projectId);
  const specimens = run.specimenIds.map((specimenId) => experiment.specimens.find((item) => item.id === specimenId)).filter((item) => item !== undefined);
  const readings = experiment.measurements.filter((item) => item.runId === run.id).sort((left, right) => String(left.elapsed ?? left.observedAt).localeCompare(String(right.elapsed ?? right.observedAt), undefined, { numeric: true }));
  const method = experiment.methodRevisions.find((item) => item.id === run.methodRevisionId);
  const variable = experiment.variables.find((item) => item.role === 'outcome') ?? experiment.variables[0];
  const sortedReadings = [...readings].sort((left, right) => {
    const valueFor = (measurement: typeof left) => {
      if (readingSort.key === 'point') return measurement.elapsed ?? measurement.observedAt ?? '';
      if (readingSort.key === 'specimen') return experiment.specimens.find((item) => item.id === measurement.specimenId)?.name ?? '';
      if (readingSort.key === 'condition') return experiment.conditions.find((item) => item.id === measurement.conditionId)?.name ?? '';
      if (readingSort.key === 'quality') return measurement.quality;
      if (readingSort.key === 'notes') return measurement.notes;
      return measurement.values[readingSort.key.slice('variable:'.length)] ?? Number.NEGATIVE_INFINITY;
    };
    const result = String(valueFor(left)).localeCompare(String(valueFor(right)), undefined, { numeric: true });
    return readingSort.direction === 'asc' ? result : -result;
  });
  const sortReadingsBy = (key: ReadingSortKey) => setReadingSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const readingHeader = (key: ReadingSortKey, label: string, numeric = false) => <SortableHeader active={readingSort.key === key} direction={readingSort.direction} onSort={() => sortReadingsBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  const settings: AnalysisSettings | undefined = variable ? {
    variableId: variable.id,
    comparison: 'observed',
    selectedPoint: readings.at(-1)?.elapsed ?? readings.at(-1)?.observedAt ?? 0,
    conditionIds: [...new Set(readings.map((item) => item.conditionId))],
    specimenIds: run.specimenIds,
    runIds: [run.id],
    showTrajectories: true,
    chartType: 'line',
  } : undefined;
  const complete = () => void updateExperiment(experiment.id, (current) => ({
    ...current,
    runs: current.runs.map((item) => item.id === run.id ? { ...item, status: 'complete', completedAt: new Date().toISOString() } : item),
    updatedAt: new Date().toISOString(),
  }));
  return <div className="experiment-page run-detail-page">
    <header className="experiment-header"><div className="experiment-heading"><div className="breadcrumb"><Link to={`/projects/${project?.id}`}>{project?.name}</Link><span>/</span><Link to={`/experiments/${experiment.id}/overview`}>{experiment.code}</Link><span>/</span><span>{run.name}</span></div><Link className="back-link" to={`/experiments/${experiment.id}/runs`}><ArrowLeft size={16} /> All runs</Link><h1>{run.name}</h1><p>{experiment.title} · procedure execution detail and captured readings</p></div><div className="experiment-actions"><StatusBadge tone={run.status === 'complete' ? 'success' : 'info'}>{run.status}</StatusBadge>{run.status !== 'complete' && <Button variant="primary" onClick={complete}><CheckCircle2 size={16} /> Mark complete</Button>}</div></header>
    <nav className="experiment-tabs" aria-label="Experiment sections"><div className="experiment-tabs-inner">{tabs.map((tab) => <Link key={tab} className={tab === 'runs' ? 'active' : ''} to={`/experiments/${experiment.id}/${tab}`}>{tab[0].toUpperCase() + tab.slice(1)}</Link>)}</div></nav>
    <div className="experiment-content run-detail-content">
      <div className="run-detail-lead"><div><p className="eyebrow">Run detail</p><h2>Execution context and run-specific data</h2><p>These readings belong to one procedure execution. They do not represent additional independent physical specimens.</p></div><Link to={`/experiments/${experiment.id}/data`}><Button>Open all experiment data</Button></Link></div>
      <div className="metric-grid run-metrics"><Metric value={readings.length} label="readings in this run" /><Metric value={specimens.length} label="associated specimens" /><Metric value={readings.filter((item) => item.quality === 'review').length} label="need review" /><Metric value={run.cycle ?? 1} label="recorded cycle" /></div>
      <div className="run-detail-grid">
        <div className="run-detail-main">
          {variable && settings && <Panel className="chart-panel" title={<div><h2>{variable.name} during this run</h2><p className="panel-subtitle">Only measurements recorded against {run.name} are shown.</p></div>}><ExperimentChart experiment={experiment} variableId={variable.id} settings={settings} /></Panel>}
          <Panel title={<div><h2>Run measurements</h2><p className="panel-subtitle">Effective values, units, quality flags, and correction provenance.</p></div>}>
            {readings.length ? <div className="table-scroll"><table><thead><tr>{readingHeader('point', experiment.kind === 'plant' ? 'Observation date' : 'Elapsed', true)}{readingHeader('specimen', 'Specimen')}{readingHeader('condition', 'Condition')}{experiment.variables.map((item) => <SortableHeader key={item.id} active={readingSort.key === `variable:${item.id}`} direction={readingSort.direction} onSort={() => sortReadingsBy(`variable:${item.id}`)} className="numeric">{item.name} ({item.unit})</SortableHeader>)}{readingHeader('quality', 'Quality')}{readingHeader('notes', 'Notes')}</tr></thead><tbody>{sortedReadings.map((measurement) => <tr key={measurement.id}><td className="numeric">{measurement.elapsed !== undefined ? measurement.elapsed : measurement.observedAt}</td><td>{experiment.specimens.find((item) => item.id === measurement.specimenId)?.name}</td><td><span className="condition-label"><i style={{ background: experiment.conditions.find((item) => item.id === measurement.conditionId)?.colour }} />{experiment.conditions.find((item) => item.id === measurement.conditionId)?.name}</span></td>{experiment.variables.map((item) => <td className="numeric" key={item.id}>{measurement.values[item.id] ?? '—'}{measurement.corrections.some((correction) => correction.variableId === item.id) && <small className="corrected-mark"> corrected</small>}</td>)}<td><StatusBadge tone={measurement.quality === 'review' ? 'warning' : 'success'}>{measurement.quality === 'review' ? 'Review' : 'Valid'}</StatusBadge></td><td>{measurement.notes || '—'}</td></tr>)}</tbody></table></div> : <div className="run-empty-data"><Gauge /><h3>No readings captured for this run</h3><p>Add measurements from the experiment Data tab when this execution begins.</p><Link to={`/experiments/${experiment.id}/data`}><Button variant="primary">Open data capture</Button></Link></div>}
          </Panel>
        </div>
        <aside className="run-detail-side">
          <Panel title={<h2>Execution record</h2>}><div className="run-context-list"><div><CalendarDays /><span><small>Started</small><strong>{formatDateTime(run.startedAt)}</strong></span></div><div><CheckCircle2 /><span><small>Completed</small><strong>{formatDateTime(run.completedAt)}</strong></span></div><div><PlayCircle /><span><small>Status</small><strong>{run.status}</strong></span></div><div><FileText /><span><small>Method revision</small><strong>{method ? `v${method.version} — ${method.title}` : 'Unavailable'}</strong></span></div>{(run.cycle ?? 1) > 1 && <div><Clock3 /><span><small>Repeated cycle</small><strong>Cycle {run.cycle} on the same specimen</strong></span></div>}</div></Panel>
          <Panel title={<h2>Associated specimens</h2>}><div className="run-specimen-list">{specimens.map((specimen) => <div key={specimen.id}><span className="experiment-icon"><FlaskConical /></span><span><strong>{specimen.name}</strong><small>{experiment.conditions.find((item) => item.id === specimen.conditionId)?.name}</small><small>{specimen.experimentalUnit || 'No experimental unit recorded'}</small></span></div>)}</div></Panel>
          <Panel title={<h2>Execution deviations</h2>}><p className={run.deviations ? '' : 'muted'}>{run.deviations || 'No deviations from the recorded method revision.'}</p></Panel>
          {method && <Panel title={<h2>Method used</h2>}><ol className="method-steps compact">{method.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><p className="muted"><strong>Equipment:</strong> {method.equipment}</p></Panel>}
        </aside>
      </div>
    </div>
  </div>;
}
