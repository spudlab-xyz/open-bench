import { Copy, Download, FileDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Field, Modal, StatusBadge } from '../../components/ui';
import { VersionAuditButton } from '../../components/VersionAudit';
import { useWorkspace } from '../../context/WorkspaceContext';
import { measurementsToCsv } from '../../domain/csv';
import { createExperimentExport, remapImportedExperiment } from '../../domain/exchange';
import type { Experiment } from '../../types';
import { downloadText } from '../../utils/files';
import { OverviewTab } from './OverviewTab';
import { MethodTab } from './MethodTab';
import { RunsTab } from './RunsTab';
import { SpecimensTab } from './SpecimensTab';
import { DataTab } from './DataTab';
import { AnalysisTab } from './AnalysisTab';
import { ReportTab } from './ReportTab';

const tabs = ['overview', 'method', 'specimens', 'runs', 'data', 'analysis', 'report'] as const;

export function ExperimentPage() {
  const { id, tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const { workspace, updateExperiment, commit } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [copyMeasurements, setCopyMeasurements] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const experiment = workspace?.experiments.find((item) => item.id === id);
  const project = workspace?.projects.find((item) => item.id === experiment?.projectId);
  if (!workspace) return null;
  if (!experiment) return <Navigate to="/experiments" replace />;
  if (!tabs.includes(tab as typeof tabs[number])) return <Navigate to={`/experiments/${experiment.id}/overview`} replace />;
  const saveEdit = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const outcome = String(data.get('outcome')).trim();
    const unit = String(data.get('unit')).trim();
    const currentOutcome = experiment.variables.find((item) => item.role === 'outcome');
    if (outcome && !unit) { setEditError('Specify the measurement unit. Use “dimensionless” when the outcome has no physical unit.'); return; }
    if (!outcome && unit) { setEditError('Specify the measured outcome for the entered unit.'); return; }
    if (experiment.measurements.length && currentOutcome?.unit.trim() && unit !== currentOutcome.unit) { setEditError('The unit cannot be relabelled after measurements exist. Create a new experiment or preserve the recorded unit.'); return; }
    if (await updateExperiment(experiment.id, (current) => {
      const existingOutcome = current.variables.find((item) => item.role === 'outcome');
      const variables = existingOutcome
        ? outcome ? current.variables.map((item) => item.id === existingOutcome.id ? { ...item, name: outcome, unit } : item) : current.variables.filter((item) => item.id !== existingOutcome.id)
        : outcome ? [...current.variables, { id: `variable-${crypto.randomUUID()}`, name: outcome, unit, role: 'outcome' as const }] : current.variables;
      return { ...current, title: String(data.get('title')), question: String(data.get('question')), hypothesis: String(data.get('hypothesis')) || undefined, measuredOutcome: outcome, variables, controls: String(data.get('controls')), schedule: String(data.get('schedule')), updatedAt: new Date().toISOString() };
    })) { setEditing(false); setEditError(''); }
  };
  const duplicate = async () => {
    const copy = remapImportedExperiment(createExperimentExport(experiment), Date.now());
    copy.title = `${experiment.title} — copy`;
    copy.sourceExperimentId = experiment.id;
    copy.importProvenance = `Duplicated from ${experiment.code}.`;
    copy.code = `${experiment.code}-D${workspace.experiments.filter((item) => item.sourceExperimentId === experiment.id).length + 1}`;
    copy.status = 'planning';
    copy.conclusion = '';
    if (!copyMeasurements) { copy.measurements = []; copy.runs = []; copy.analyses = []; copy.dataRevision = 1; }
    if (await commit((current) => ({ ...current, experiments: [...current.experiments, copy] }))) navigate(`/experiments/${copy.id}/overview`);
  };
  const remove = async () => {
    if (!confirm(`Delete “${experiment.title}” and its local records? This cannot be undone.`)) return;
    if (await commit((current) => ({ ...current, experiments: current.experiments.filter((item) => item.id !== experiment.id) }))) navigate('/experiments');
  };
  const activeTab = tab as typeof tabs[number];
  return <div className="experiment-page">
    <header className="experiment-header"><div className="experiment-heading"><div className="breadcrumb"><Link to="/projects">{project?.name}</Link><span>/</span><span>{experiment.code}</span></div><h1>{experiment.title}</h1><p>{experiment.description}</p></div><div className="experiment-actions"><StatusBadge tone={experiment.status === 'complete' ? 'success' : 'warning'}>{experiment.status.replace('-', ' ')}</StatusBadge><VersionAuditButton entityType="experiment" entityId={experiment.id} label={experiment.title} /><Button onClick={() => { setEditError(''); setEditing(true); }}><Pencil size={16} /> Edit</Button><div className="menu-wrap"><Button aria-label="More experiment actions" onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={18} /></Button>{menuOpen && <div className="action-menu"><button onClick={() => { setDuplicating(true); setMenuOpen(false); }}><Copy /> Duplicate</button><button onClick={() => downloadText(`${experiment.code}.json`, JSON.stringify(createExperimentExport(experiment), null, 2), 'application/json')}><Download /> Export JSON</button><button onClick={() => downloadText(`${experiment.code}-measurements.csv`, measurementsToCsv(experiment), 'text/csv')}><FileDown /> Export CSV</button><button className="danger-text" onClick={() => void remove()}><Trash2 /> Delete</button></div>}</div></div></header>
    <nav className="experiment-tabs" aria-label="Experiment sections"><div className="experiment-tabs-inner">{tabs.map((item) => <Link key={item} className={activeTab === item ? 'active' : ''} to={`/experiments/${experiment.id}/${item}`}>{item[0].toUpperCase() + item.slice(1)}</Link>)}</div></nav>
    <div className="experiment-content">{activeTab === 'overview' && <OverviewTab experiment={experiment} />}{activeTab === 'method' && <MethodTab experiment={experiment} />}{activeTab === 'specimens' && <SpecimensTab experiment={experiment} />}{activeTab === 'runs' && <RunsTab experiment={experiment} />}{activeTab === 'data' && <DataTab experiment={experiment} />}{activeTab === 'analysis' && <AnalysisTab experiment={experiment} />}{activeTab === 'report' && <ReportTab experiment={experiment} />}</div>
    {editing && <Modal title="Edit experiment planning" onClose={() => setEditing(false)} wide><form onSubmit={(event) => { event.preventDefault(); void saveEdit(event.currentTarget); }} className="form-stack"><Field label="Title"><input name="title" defaultValue={experiment.title} required /></Field><Field label="Research question"><textarea name="question" defaultValue={experiment.question} rows={3} /></Field><Field label="Hypothesis (blank for exploratory work)"><textarea name="hypothesis" defaultValue={experiment.hypothesis} rows={3} /></Field><div className="form-grid"><Field label="Measured outcome"><input name="outcome" defaultValue={experiment.measuredOutcome} /></Field><Field label="Measurement unit" hint={experiment.measurements.length && experiment.variables.find((item) => item.role === 'outcome')?.unit.trim() ? 'Locked because measurements already exist.' : 'Required with an outcome. Use “dimensionless” when no physical unit applies.'}><input name="unit" defaultValue={experiment.variables.find((item) => item.role === 'outcome')?.unit} readOnly={Boolean(experiment.measurements.length && experiment.variables.find((item) => item.role === 'outcome')?.unit.trim())} /></Field></div><Field label="Controls and context"><textarea name="controls" defaultValue={experiment.controls} rows={3} /></Field><Field label="Measurement schedule"><input name="schedule" defaultValue={experiment.schedule} /></Field>{editError && <p className="form-error" role="alert">{editError}</p>}<div className="form-actions"><Button type="button" onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" type="submit">Save planning</Button></div></form></Modal>}
    {duplicating && <Modal title="Duplicate experiment" onClose={() => setDuplicating(false)}><div className="form-stack"><p>The copy will retain a source-experiment reference. Its design, conditions, methods and specimens will be copied.</p><label className="check-row"><input type="checkbox" checked={copyMeasurements} onChange={(event) => setCopyMeasurements(event.target.checked)} /><span><strong>Copy runs and measurements</strong><small>Off by default. Leave off to duplicate only the design.</small></span></label><div className="form-actions"><Button onClick={() => setDuplicating(false)}>Cancel</Button><Button variant="primary" onClick={() => void duplicate()}>Create copy</Button></div></div></Modal>}
  </div>;
}

export type ExperimentTabProps = { experiment: Experiment };
