import { FolderKanban, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, Modal, Panel, SortableHeader, StatusBadge } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { PROJECT_STATUSES, projectStatusLabel, projectStatusTone } from '../domain/projects';
import type { Project, ProjectStatus } from '../types';
import { formatDate, uid } from '../utils/files';

export function ProjectsPage() {
  const { workspace, commit } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | ProjectStatus>('all');
  const [sort, setSort] = useState<{ key: 'project' | 'status' | 'experiments' | 'runs' | 'readings' | 'updated'; direction: 'asc' | 'desc' }>({ key: 'updated', direction: 'desc' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const filtered = useMemo(() => workspace?.projects.filter((project) => {
    const haystack = `${project.name} ${project.description}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === 'all' || project.status === status);
  }).sort((left, right) => {
    const counts = (project: Project) => {
      const experiments = workspace.experiments.filter((item) => item.projectId === project.id);
      return { experiments: experiments.length, runs: experiments.reduce((sum, item) => sum + item.runs.length, 0), readings: experiments.reduce((sum, item) => sum + item.measurements.length, 0) };
    };
    const leftCounts = counts(left);
    const rightCounts = counts(right);
    const values = { project: [left.name, right.name], status: [left.status, right.status], experiments: [leftCounts.experiments, rightCounts.experiments], runs: [leftCounts.runs, rightCounts.runs], readings: [leftCounts.readings, rightCounts.readings], updated: [left.updatedAt, right.updatedAt] }[sort.key];
    const result = typeof values[0] === 'number' ? Number(values[0]) - Number(values[1]) : String(values[0]).localeCompare(String(values[1]), undefined, { numeric: true });
    return sort.direction === 'asc' ? result : -result;
  }) ?? [], [workspace, query, status, sort]);
  if (!workspace) return null;
  const sortBy = (key: typeof sort.key) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const header = (key: typeof sort.key, label: string, numeric = false) => <SortableHeader active={sort.key === key} direction={sort.direction} onSort={() => sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;

  const createProject = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    if (!name) { setCreateError('Give the project a name.'); return; }
    if (workspace.projects.some((project) => project.name.toLowerCase() === name.toLowerCase())) { setCreateError('A project with this name already exists.'); return; }
    const now = new Date().toISOString();
    const projectStatus = String(data.get('status')) as ProjectStatus;
    const project: Project = {
      id: uid('project'),
      name,
      description: String(data.get('description')).trim(),
      colour: String(data.get('colour')),
      status: projectStatus,
      createdAt: now,
      updatedAt: now,
      lifecycleEvents: [{ id: uid('lifecycle'), status: projectStatus, changedAt: now, note: 'Project created.' }],
    };
    if (await commit((current) => ({ ...current, projects: [...current.projects, project] }))) {
      setCreateOpen(false);
      navigate(`/projects/${project.id}`);
    }
  };

  return <div className="page"><header className="page-header"><div><p className="eyebrow">Workspace</p><h1>Projects</h1><p>Group related experiments and track each collection from planning through completion.</p></div><Button variant="primary" onClick={() => { setCreateError(''); setCreateOpen(true); }}><Plus size={18} /> Create project</Button></header>
    <Panel className="filter-bar"><div className="search-field"><Search size={18} /><input aria-label="Search projects" placeholder="Search project names and descriptions" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select aria-label="Filter by project status" value={status} onChange={(event) => setStatus(event.target.value as 'all' | ProjectStatus)}><option value="all">All statuses</option>{PROJECT_STATUSES.map((item) => <option key={item} value={item}>{projectStatusLabel(item)}</option>)}</select></Panel>
    <Panel><div className="table-scroll listing-table"><table className="project-table"><colgroup><col className="project-name-column" /><col className="project-status-column" /><col className="project-count-column" /><col className="project-count-column" /><col className="project-count-column" /><col className="project-updated-column" /></colgroup><thead><tr>{header('project', 'Project')}{header('status', 'Status')}{header('experiments', 'Experiments', true)}{header('runs', 'Runs', true)}{header('readings', 'Readings', true)}{header('updated', 'Updated')}</tr></thead><tbody>{filtered.map((project) => {
      const experiments = workspace.experiments.filter((item) => item.projectId === project.id);
      return <tr key={project.id}><td className="project-name-cell"><Link className="table-primary project-table-primary" to={`/projects/${project.id}`}><span className="project-table-icon" style={{ background: project.colour }}><FolderKanban /></span><span className="project-table-copy"><strong>{project.name}</strong><small title={project.description || 'No description'}>{project.description || 'No description'}</small></span></Link></td><td><StatusBadge tone={projectStatusTone(project.status)}>{projectStatusLabel(project.status)}</StatusBadge></td><td className="numeric">{experiments.length}</td><td className="numeric">{experiments.reduce((sum, item) => sum + item.runs.length, 0)}</td><td className="numeric">{experiments.reduce((sum, item) => sum + item.measurements.length, 0)}</td><td>{formatDate(project.updatedAt)}</td></tr>;
    })}</tbody></table></div>{!filtered.length && <div className="no-results">No projects match these filters.</div>}</Panel>
    {createOpen && <Modal title="Create project" onClose={() => setCreateOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void createProject(event.currentTarget); }}><Field label="Project name"><input name="name" required autoFocus onChange={() => setCreateError('')} placeholder="e.g. Water quality studies" /></Field><Field label="Description" hint="Briefly describe the related investigations this collection will contain."><textarea name="description" rows={3} /></Field><Field label="Initial lifecycle status"><select name="status" defaultValue="planned">{PROJECT_STATUSES.filter((item) => item !== 'archived').map((item) => <option key={item} value={item}>{projectStatusLabel(item)}</option>)}</select></Field><Field label="Project colour"><input className="colour-input" name="colour" type="color" defaultValue="#86cecb" /></Field>{createError && <p className="form-error revision-validation" role="alert">{createError}</p>}<div className="form-actions"><Button type="button" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary" type="submit"><Plus size={16} /> Create project</Button></div></form></Modal>}
  </div>;
}
