import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Panel, SortableHeader, StatusBadge } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatDate } from '../utils/files';

export function ExperimentsPage() {
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [project, setProject] = useState('all');
  const [sort, setSort] = useState<{ key: 'experiment' | 'project' | 'status' | 'specimens' | 'runs' | 'readings' | 'updated'; direction: 'asc' | 'desc' }>({ key: 'updated', direction: 'desc' });
  const filtered = useMemo(() => workspace?.experiments.filter((experiment) => {
    const haystack = `${experiment.title} ${experiment.code} ${experiment.description} ${experiment.question}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === 'all' || experiment.status === status) && (project === 'all' || experiment.projectId === project);
  }).sort((left, right) => {
    const projectName = (id: string) => workspace.projects.find((item) => item.id === id)?.name ?? '';
    const values = {
      experiment: [left.title, right.title], project: [projectName(left.projectId), projectName(right.projectId)], status: [left.status, right.status],
      specimens: [left.specimens.length, right.specimens.length], runs: [left.runs.length, right.runs.length], readings: [left.measurements.length, right.measurements.length], updated: [left.updatedAt, right.updatedAt],
    }[sort.key];
    const result = typeof values[0] === 'number' ? Number(values[0]) - Number(values[1]) : String(values[0]).localeCompare(String(values[1]), undefined, { numeric: true });
    return sort.direction === 'asc' ? result : -result;
  }) ?? [], [workspace, query, status, project, sort]);
  if (!workspace) return null;
  const sortBy = (key: typeof sort.key) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const header = (key: typeof sort.key, label: string, numeric = false) => <SortableHeader active={sort.key === key} direction={sort.direction} onSort={() => sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  return <div className="page"><header className="page-header"><div><p className="eyebrow">Workspace</p><h1>Experiments</h1><p>Physical specimens, procedure executions and repeated observations remain distinct.</p></div><Link to="/experiments/new"><Button variant="primary"><Plus size={18} /> Create experiment</Button></Link></header>
    <Panel className="filter-bar"><div className="search-field"><Search size={18} /><input aria-label="Search experiments" placeholder="Search questions, codes and titles" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select aria-label="Filter by project" value={project} onChange={(event) => setProject(event.target.value)}><option value="all">All projects</option>{workspace.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="planning">Planning</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select></Panel>
    <Panel><div className="table-scroll listing-table"><table><thead><tr>{header('experiment', 'Experiment')}{header('project', 'Project')}{header('status', 'Status')}{header('specimens', 'Specimens', true)}{header('runs', 'Runs', true)}{header('readings', 'Readings', true)}{header('updated', 'Updated')}</tr></thead><tbody>{filtered.map((experiment) => <tr key={experiment.id}><td><Link className="table-primary" to={`/experiments/${experiment.id}/overview`}>{experiment.title}<small>{experiment.code} · {experiment.description}</small></Link></td><td>{workspace.projects.find((item) => item.id === experiment.projectId)?.name}</td><td><StatusBadge tone={experiment.status === 'complete' ? 'success' : 'warning'}>{experiment.status.replace('-', ' ')}</StatusBadge></td><td className="numeric">{experiment.specimens.length}</td><td className="numeric">{experiment.runs.length}</td><td className="numeric">{experiment.measurements.length}</td><td>{formatDate(experiment.updatedAt)}</td></tr>)}</tbody></table></div>{!filtered.length && <div className="no-results">No experiments match these filters.</div>}</Panel>
  </div>;
}
