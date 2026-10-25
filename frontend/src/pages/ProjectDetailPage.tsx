import { ArrowLeft, ArrowRight, Beaker, CheckCircle2, Clock3, History, Milestone, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Field, Metric, Modal, Panel, StatusBadge } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { PROJECT_STATUSES, projectStatusLabel, projectStatusTone } from '../domain/projects';
import type { ProjectStatus } from '../types';
import { formatDate, formatDateTime, uid } from '../utils/files';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { workspace, commit } = useWorkspace();
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleError, setLifecycleError] = useState('');
  if (!workspace) return null;
  const project = workspace.projects.find((item) => item.id === projectId);
  if (!project) return <Navigate to="/projects" replace />;
  const experiments = workspace.experiments
    .filter((item) => item.projectId === project.id)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const runs = experiments.flatMap((experiment) => experiment.runs.map((run) => ({ experiment, run })));
  const latestRuns = [...runs].sort((left, right) => right.run.startedAt.localeCompare(left.run.startedAt)).slice(0, 5);
  const reviewCount = experiments.reduce((sum, experiment) => sum + experiment.measurements.filter((item) => item.quality === 'review').length, 0);
  const updateLifecycle = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const status = String(data.get('status')) as ProjectStatus;
    const note = String(data.get('note')).trim();
    if (status === project.status) { setLifecycleError('Choose a different lifecycle status.'); return; }
    if (!note) { setLifecycleError('Explain why the project lifecycle is changing.'); return; }
    const changedAt = new Date().toISOString();
    const saved = await commit((current) => ({
      ...current,
      projects: current.projects.map((item) => item.id === project.id ? {
        ...item,
        status,
        updatedAt: changedAt,
        lifecycleEvents: [...item.lifecycleEvents, { id: uid('lifecycle'), status, changedAt, note }],
      } : item),
    }));
    if (saved) setLifecycleOpen(false);
  };
  return <div className="page project-dashboard">
    <header className="page-header project-dashboard-header"><div><Link className="back-link" to="/projects"><ArrowLeft size={16} /> Projects</Link><div className="project-heading"><span style={{ background: project.colour }}><Beaker /></span><div><p className="eyebrow">Project dashboard</p><div className="project-title-row"><h1>{project.name}</h1><StatusBadge tone={projectStatusTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div><p>{project.description}</p></div></div></div><div className="button-row"><Button onClick={() => { setLifecycleError(''); setLifecycleOpen(true); }}><Milestone size={17} /> Update lifecycle</Button><Link to={`/experiments/new?project=${encodeURIComponent(project.id)}`}><Button variant="primary"><Plus size={18} /> Create experiment</Button></Link></div></header>
    <div className="metric-grid project-metrics"><Metric value={experiments.length} label="experiments" /><Metric value={runs.length} label="procedure executions" /><Metric value={experiments.reduce((sum, item) => sum + item.measurements.length, 0)} label="measurements" /><Metric value={reviewCount} label="readings need review" /></div>
    <div className="project-dashboard-grid">
      <Panel title={<div><h2>Experiments in this project</h2><p className="panel-subtitle">Related investigations share project context, not specimens or results.</p></div>} className="project-experiment-panel">
        {experiments.length ? <div className="project-dashboard-experiments">{experiments.map((experiment) => {
          const completedRuns = experiment.runs.filter((run) => run.status === 'complete').length;
          const experimentReviews = experiment.measurements.filter((item) => item.quality === 'review').length;
          return <Link key={experiment.id} to={`/experiments/${experiment.id}/overview`} className="project-dashboard-experiment">
            <span className="experiment-icon"><Beaker /></span>
            <span className="card-main"><strong>{experiment.title}</strong><small>{experiment.code} · updated {formatDate(experiment.updatedAt)}</small><span>{experiment.question || experiment.description}</span></span>
            <span className="project-experiment-stats"><span><strong>{experiment.specimens.length}</strong><small>specimens</small></span><span><strong>{completedRuns}/{experiment.runs.length}</strong><small>runs complete</small></span><span><strong>{experiment.measurements.length}</strong><small>readings</small></span></span>
            <span className="card-meta"><StatusBadge tone={experiment.status === 'complete' ? 'success' : 'warning'}>{experiment.status.replace('-', ' ')}</StatusBadge>{experimentReviews > 0 && <small className="warning-text">{experimentReviews} need review</small>}<ArrowRight size={17} /></span>
          </Link>;
        })}</div> : <EmptyState title="No experiments in this project" action={<Link to={`/experiments/new?project=${encodeURIComponent(project.id)}`}><Button variant="primary">Create the first experiment</Button></Link>}>Start an investigation within this project collection.</EmptyState>}
      </Panel>
      <aside className="project-dashboard-side">
        <Panel title={<h2><History /> Lifecycle history</h2>}><div className="project-lifecycle-list">{[...project.lifecycleEvents].reverse().map((event, index) => <div key={event.id}><span className="lifecycle-marker" /><span><strong>{projectStatusLabel(event.status)}</strong><small>{formatDateTime(event.changedAt)}{index === 0 ? ' · current' : ''}</small><p>{event.note}</p></span></div>)}</div></Panel>
        <Panel title={<h2>Latest run activity</h2>}>{latestRuns.length ? <div className="activity-list">{latestRuns.map(({ experiment, run }) => <Link key={run.id} to={`/experiments/${experiment.id}/runs/${run.id}`}><span className={`activity-icon activity-${run.status}`}>{run.status === 'complete' ? <CheckCircle2 /> : <Clock3 />}</span><span><strong>{run.name}</strong><small>{experiment.title}</small><small>{formatDate(run.startedAt)} · {experiment.measurements.filter((item) => item.runId === run.id).length} readings</small></span><ArrowRight /></Link>)}</div> : <p className="muted">No run activity yet.</p>}</Panel>
        <Panel title={<h2>Project attention</h2>}>{reviewCount > 0 ? <div className="project-attention"><TriangleAlert /><div><strong>{reviewCount} reading{reviewCount === 1 ? '' : 's'} need review</strong><p>Review quality flags within each experiment before refreshing saved analyses.</p></div></div> : <div className="project-attention project-attention-clear"><CheckCircle2 /><div><strong>No quality reviews waiting</strong><p>All current readings are marked valid.</p></div></div>}</Panel>
      </aside>
    </div>
    {lifecycleOpen && <Modal title="Update project lifecycle" onClose={() => setLifecycleOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void updateLifecycle(event.currentTarget); }}><div className="lifecycle-current"><small>Current status</small><StatusBadge tone={projectStatusTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div><Field label="New status"><select name="status" defaultValue={project.status} onChange={() => setLifecycleError('')}>{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}</select></Field><Field label="Lifecycle note" hint="Stored permanently in this project's lifecycle history."><textarea name="note" rows={4} required onChange={() => setLifecycleError('')} placeholder="Why is this project moving to a new status?" /></Field>{lifecycleError && <p className="form-error revision-validation" role="alert">{lifecycleError}</p>}<div className="form-actions"><Button type="button" onClick={() => setLifecycleOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Save lifecycle event</Button></div></form></Modal>}
  </div>;
}
