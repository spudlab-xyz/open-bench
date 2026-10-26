import { AlertTriangle, ArrowRight, Beaker, CheckCircle2, Clock3, FolderKanban, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Panel, StatusBadge } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatDateTime } from '../utils/files';

export function HomePage() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;
  const recent = [...workspace.experiments].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const resume = recent.find((experiment) => experiment.status !== 'complete') ?? recent[0];
  const attention = workspace.experiments.filter((experiment) => experiment.measurements.some((measurement) => measurement.quality !== 'valid') || !experiment.methodRevisions.length || !experiment.specimens.length);
  const latestRuns = workspace.experiments
    .flatMap((experiment) => experiment.runs.map((run) => ({ experiment, run })))
    .sort((left, right) => right.run.startedAt.localeCompare(left.run.startedAt))
    .slice(0, 5);
  return <div className="page page-home">
    <header className="page-header"><div><p className="eyebrow">Workspace overview</p><h1>Dashboard</h1><p>Resume experiments, review recent activity and move between project collections.</p></div></header>
    {resume && <section className="resume-banner"><div className="resume-accent" /><div className="resume-copy"><span className="resume-label"><Play /> Continue where you left off</span><h2>{resume.title}</h2><p>{resume.question || resume.description}</p><div className="resume-meta"><StatusBadge tone={resume.status === 'complete' ? 'success' : 'warning'}>{resume.status.replace('-', ' ')}</StatusBadge><span>{workspace.projects.find((item) => item.id === resume.projectId)?.name}</span><span>Updated {formatDateTime(resume.updatedAt)}</span></div></div><div className="resume-stats"><span><strong>{resume.runs.filter((item) => item.status === 'complete').length}/{resume.runs.length}</strong><small>runs complete</small></span><span><strong>{resume.measurements.length}</strong><small>readings</small></span></div><Link to={`/experiments/${resume.id}/overview`}><Button variant="primary">Resume experiment <ArrowRight size={17} /></Button></Link></section>}

    <div className="dashboard-grid">
      <Panel title={<div><h2>Latest experiments</h2><p className="panel-subtitle">Recently changed work across every project.</p></div>} action={<Link className="text-link" to="/experiments">Explore experiments <ArrowRight size={15} /></Link>} className="dashboard-latest">
        {recent.length ? <div className="dashboard-experiment-grid">{recent.slice(0, 4).map((experiment) => {
          const project = workspace.projects.find((item) => item.id === experiment.projectId);
          return <Link className="dashboard-experiment-card" to={`/experiments/${experiment.id}/overview`} key={experiment.id}>
            <span className="experiment-icon"><Beaker /></span><span className="card-main"><strong>{experiment.title}</strong><small>{project?.name} · {experiment.code}</small><span>{experiment.description}</span></span><span className="dashboard-card-footer"><StatusBadge tone={experiment.status === 'complete' ? 'success' : 'warning'}>{experiment.status.replace('-', ' ')}</StatusBadge><small>{experiment.runs.length} runs · {experiment.measurements.length} readings</small><ArrowRight /></span>
          </Link>;
        })}</div> : <EmptyState title="No experiments yet" action={<Link to="/projects"><Button>Open projects</Button></Link>}>Choose a project collection to begin planning work.</EmptyState>}
      </Panel>

      <Panel title={<h2>Needs attention</h2>} action={attention.length > 0 && <span className="attention-count">{attention.length}</span>} className="dashboard-attention">
        {attention.length ? <div className="attention-list">{attention.map((experiment) => {
          const count = experiment.measurements.filter((item) => item.quality !== 'valid').length;
          return <Link to={`/experiments/${experiment.id}/data`} key={experiment.id}><AlertTriangle size={18} /><span><strong>{experiment.title}</strong><small>{count ? `${count} reading${count === 1 ? '' : 's'} need review` : 'Planning details are incomplete'}</small></span><ArrowRight size={16} /></Link>;
        })}</div> : <EmptyState title="Nothing waiting">No readings need review and required setup records are present.</EmptyState>}
      </Panel>

      <Panel title={<div><h2>Project collections</h2><p className="panel-subtitle">Related investigations grouped by purpose.</p></div>} action={<Link className="text-link" to="/projects">All projects <ArrowRight size={15} /></Link>} className="dashboard-projects">
        <div className="dashboard-project-list">{workspace.projects.map((project) => {
          const experiments = workspace.experiments.filter((item) => item.projectId === project.id);
          const latest = [...experiments].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
          return <Link key={project.id} to={`/projects/${project.id}`}><span className="project-mini-icon" style={{ color: project.colour }}><FolderKanban /></span><span><strong>{project.name}</strong><small>{experiments.length} experiment{experiments.length === 1 ? '' : 's'}{latest ? ` · latest ${formatDateTime(latest.updatedAt)}` : ''}</small></span><ArrowRight /></Link>;
        })}</div>
      </Panel>

      <Panel title={<div><h2>Latest run activity</h2><p className="panel-subtitle">Recent procedure executions and their captured data.</p></div>} className="dashboard-runs">
        <div className="activity-list">{latestRuns.map(({ experiment, run }) => <Link key={run.id} to={`/experiments/${experiment.id}/runs/${run.id}`}><span className={`activity-icon activity-${run.status}`}>{run.status === 'complete' ? <CheckCircle2 /> : <Clock3 />}</span><span><strong>{run.name}</strong><small>{experiment.title}</small><small>{formatDateTime(run.startedAt)} · {experiment.measurements.filter((item) => item.runId === run.id).length} readings</small></span><StatusBadge tone={run.status === 'complete' ? 'success' : 'info'}>{run.status}</StatusBadge><ArrowRight /></Link>)}</div>
      </Panel>
    </div>
  </div>;
}
