import { ArrowLeft, ArrowRight, Beaker, CheckCircle2, Clock3, History, Milestone, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Field, Metric, Modal, Panel, StatusBadge } from '../components/ui';
import { VersionAuditButton } from '../components/VersionAudit';
import { useWorkspace } from '../context/WorkspaceContext';
import { PROJECT_STATUSES, projectDeletionImpact, projectStatusLabel, projectStatusTone, removeProject } from '../domain/projects';
import type { ProjectStatus } from '../types';
import { formatDateTime, uid } from '../utils/files';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { workspace, commit, deleteAttachment } = useWorkspace();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleError, setLifecycleError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  if (!workspace) return null;
  const project = workspace.projects.find((item) => item.id === projectId);
  if (!project) return <Navigate to="/projects" replace />;
  const experiments = workspace.experiments
    .filter((item) => item.projectId === project.id)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const runs = experiments.flatMap((experiment) => experiment.runs.map((run) => ({ experiment, run })));
  const latestRuns = [...runs].sort((left, right) => right.run.startedAt.localeCompare(left.run.startedAt)).slice(0, 5);
  const reviewCount = experiments.reduce((sum, experiment) => sum + experiment.measurements.filter((item) => item.quality !== 'valid').length, 0);
  const deletionImpact = projectDeletionImpact(workspace, project.id);
  const updateProject = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    if (!name) { setEditError('Give the project a name.'); return; }
    if (workspace.projects.some((item) => item.id !== project.id && item.name.toLowerCase() === name.toLowerCase())) { setEditError('A project with this name already exists.'); return; }
    const saved = await commit((current) => ({
      ...current,
      projects: current.projects.map((item) => item.id === project.id ? {
        ...item,
        name,
        description: String(data.get('description')).trim(),
        colour: String(data.get('colour')),
        updatedAt: new Date().toISOString(),
      } : item),
    }));
    if (saved) setEditOpen(false);
  };
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
    }), { reason: note });
    if (saved) setLifecycleOpen(false);
  };
  const deleteProject = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const confirmation = String(data.get('confirmation') ?? '');
    const reason = String(data.get('reason') ?? '').trim();
    if (confirmation !== project.name) { setDeleteError(`Enter “${project.name}” exactly to confirm deletion.`); return; }
    if (!reason) { setDeleteError('Explain why this project is being deleted.'); return; }
    const deleted = await commit((current) => removeProject(current, project.id), { reason });
    if (!deleted) return;
    const cleanup = await Promise.allSettled(deletionImpact.attachmentIds.map((id) => deleteAttachment(id)));
    const cleanupFailures = cleanup.filter((result) => result.status === 'rejected').length;
    if (cleanupFailures) alert(`The project was deleted, but ${cleanupFailures} attachment file${cleanupFailures === 1 ? '' : 's'} could not be removed from browser storage.`);
    navigate('/projects', { replace: true });
  };
  return <div className="page project-dashboard">
    <header className="page-header project-dashboard-header"><div><Link className="back-link" to="/projects"><ArrowLeft size={16} /> Projects</Link><div className="project-heading"><span style={{ background: project.colour }}><Beaker /></span><div><p className="eyebrow">Project dashboard</p><div className="project-title-row"><h1>{project.name}</h1><StatusBadge tone={projectStatusTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge><VersionAuditButton entityType="project" entityId={project.id} label={project.name} /></div><p>{project.description}</p></div></div></div><div className="button-row"><Button onClick={() => { setEditError(''); setEditOpen(true); }}><Pencil size={17} /> Edit project</Button><Button onClick={() => { setLifecycleError(''); setLifecycleOpen(true); }}><Milestone size={17} /> Update lifecycle</Button><Button variant="danger" onClick={() => { setDeleteError(''); setDeleteOpen(true); }}><Trash2 size={17} /> Delete project</Button><Link to={`/experiments/new?project=${encodeURIComponent(project.id)}`}><Button variant="primary"><Plus size={18} /> Create experiment</Button></Link></div></header>
    <div className="metric-grid project-metrics"><Metric value={experiments.length} label="experiments" /><Metric value={runs.length} label="procedure executions" /><Metric value={experiments.reduce((sum, item) => sum + item.measurements.length, 0)} label="measurements" /><Metric value={reviewCount} label="readings need review" /></div>
    <div className="project-dashboard-grid">
      <Panel title={<div><h2>Experiments in this project</h2><p className="panel-subtitle">Related investigations share project context, not specimens or results.</p></div>} className="project-experiment-panel">
        {experiments.length ? <div className="project-dashboard-experiments">{experiments.map((experiment) => {
          const completedRuns = experiment.runs.filter((run) => run.status === 'complete').length;
          const experimentReviews = experiment.measurements.filter((item) => item.quality !== 'valid').length;
          return <Link key={experiment.id} to={`/experiments/${experiment.id}/overview`} className="project-dashboard-experiment">
            <span className="experiment-icon"><Beaker /></span>
            <span className="card-main"><strong>{experiment.title}</strong><small>{experiment.code} · updated {formatDateTime(experiment.updatedAt)}</small><span>{experiment.question || experiment.description}</span></span>
            <span className="project-experiment-stats"><span><strong>{experiment.specimens.length}</strong><small>specimens</small></span><span><strong>{completedRuns}/{experiment.runs.length}</strong><small>runs complete</small></span><span><strong>{experiment.measurements.length}</strong><small>readings</small></span></span>
            <span className="card-meta"><StatusBadge tone={experiment.status === 'complete' ? 'success' : 'warning'}>{experiment.status.replace('-', ' ')}</StatusBadge>{experimentReviews > 0 && <small className="warning-text">{experimentReviews} need review</small>}<ArrowRight size={17} /></span>
          </Link>;
        })}</div> : <EmptyState title="No experiments in this project" action={<Link to={`/experiments/new?project=${encodeURIComponent(project.id)}`}><Button variant="primary">Create the first experiment</Button></Link>}>Start an investigation within this project collection.</EmptyState>}
      </Panel>
      <aside className="project-dashboard-side">
        <Panel title={<h2><History /> Lifecycle history</h2>}><div className="project-lifecycle-list">{[...project.lifecycleEvents].reverse().map((event, index) => <div key={event.id}><span className="lifecycle-marker" /><span><strong>{projectStatusLabel(event.status)}</strong><small>{formatDateTime(event.changedAt)}{index === 0 ? ' · current' : ''}</small><p>{event.note}</p><VersionAuditButton entityType="project lifecycle event" entityId={event.id} label={`${project.name}: ${projectStatusLabel(event.status)}`} compact /></span></div>)}</div></Panel>
        <Panel title={<h2>Latest run activity</h2>}>{latestRuns.length ? <div className="activity-list">{latestRuns.map(({ experiment, run }) => <Link key={run.id} to={`/experiments/${experiment.id}/runs/${run.id}`}><span className={`activity-icon activity-${run.status}`}>{run.status === 'complete' ? <CheckCircle2 /> : <Clock3 />}</span><span><strong>{run.name}</strong><small>{experiment.title}</small><small>{formatDateTime(run.startedAt)} · {experiment.measurements.filter((item) => item.runId === run.id).length} readings</small></span><ArrowRight /></Link>)}</div> : <p className="muted">No run activity yet.</p>}</Panel>
        <Panel title={<h2>Project attention</h2>}>{reviewCount > 0 ? <div className="project-attention"><TriangleAlert /><div><strong>{reviewCount} reading{reviewCount === 1 ? '' : 's'} need review</strong><p>Review quality flags within each experiment before refreshing saved analyses.</p></div></div> : <div className="project-attention project-attention-clear"><CheckCircle2 /><div><strong>No quality reviews waiting</strong><p>All current readings are marked valid.</p></div></div>}</Panel>
      </aside>
    </div>
    {editOpen && <Modal title="Edit project details" onClose={() => setEditOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void updateProject(event.currentTarget); }}><p className="muted">Project status is managed separately through Update lifecycle. Saving changed details creates a new audited project version and requires a reason.</p><Field label="Project name"><input name="name" required defaultValue={project.name} onChange={() => setEditError('')} /></Field><Field label="Description"><textarea name="description" rows={4} defaultValue={project.description} onChange={() => setEditError('')} /></Field><Field label="Project colour"><input className="colour-input" name="colour" type="color" defaultValue={project.colour} /></Field>{editError && <p className="form-error revision-validation" role="alert">{editError}</p>}<div className="form-actions"><Button type="button" onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Save project details</Button></div></form></Modal>}
    {lifecycleOpen && <Modal title="Update project lifecycle" onClose={() => setLifecycleOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void updateLifecycle(event.currentTarget); }}><div className="lifecycle-current"><small>Current status</small><StatusBadge tone={projectStatusTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></div><p className="muted">Lifecycle status is separate from project name, description, and colour. Every status change requires a permanent lifecycle note.</p><Field label="New status"><select name="status" defaultValue={project.status} onChange={() => setLifecycleError('')}>{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}</select></Field><Field label="Lifecycle note" hint="Stored permanently in this project's lifecycle history."><textarea name="note" rows={4} required onChange={() => setLifecycleError('')} placeholder="Why is this project moving to a new status?" /></Field>{lifecycleError && <p className="form-error revision-validation" role="alert">{lifecycleError}</p>}<div className="form-actions"><Button type="button" onClick={() => setLifecycleOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Save lifecycle event</Button></div></form></Modal>}
    {deleteOpen && <Modal title="Delete project?" onClose={() => setDeleteOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void deleteProject(event.currentTarget); }}><div className="validation-box danger"><TriangleAlert /><span><strong>This removes the project and all of its active experiments.</strong> Version-history snapshots remain searchable, but attachment files are permanently removed from this browser.</span></div><dl className="detail-list"><div><dt>Experiments</dt><dd>{deletionImpact.experiments}</dd></div><div><dt>Procedure executions</dt><dd>{deletionImpact.runs}</dd></div><div><dt>Measurements</dt><dd>{deletionImpact.measurements}</dd></div><div><dt>Attachment files</dt><dd>{deletionImpact.attachments}</dd></div></dl><Field label={`Enter “${project.name}” to confirm`}><input name="confirmation" autoComplete="off" autoFocus onChange={() => setDeleteError('')} /></Field><Field label="Deletion reason" hint="Stored with every resulting deletion tombstone in Version history."><textarea name="reason" rows={4} required onChange={() => setDeleteError('')} placeholder="Why is this project being deleted?" /></Field>{deleteError && <p className="form-error revision-validation" role="alert">{deleteError}</p>}<div className="form-actions"><Button type="button" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" type="submit"><Trash2 size={16} /> Delete project and experiments</Button></div></form></Modal>}
  </div>;
}
