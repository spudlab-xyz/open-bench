import { ArrowLeft, ArrowRight, Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, Panel } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Experiment } from '../types';
import { uid } from '../utils/files';

const steps = ['Question', 'Design', 'Procedure'];

export function NewExperimentPage() {
  const { workspace, commit } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get('project');
  const initialProjectId = workspace?.projects.some((project) => project.id === requestedProjectId) ? requestedProjectId! : workspace?.projects[0]?.id ?? '';
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ title: '', question: '', hypothesis: '', exploratory: true, projectId: initialProjectId, factor: '', outcome: '', unit: '', controls: '', conditions: 'Control\nTreatment A', equipment: '', procedure: '', schedule: '' });
  const [error, setError] = useState('');
  if (!workspace) return null;
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const create = async () => {
    if (!form.title.trim()) { setError('Give the experiment a title before creating it. Other planning details can remain incomplete.'); return; }
    const now = new Date().toISOString();
    const id = uid('experiment');
    const conditionNames = form.conditions.split('\n').map((item) => item.trim()).filter(Boolean);
    const methodId = uid('method');
    const experiment: Experiment = {
      id, kind: 'custom', code: `EXP-${String(workspace.experiments.length + 40).padStart(3, '0')}`, projectId: form.projectId,
      title: form.title.trim(), description: form.question.trim() || 'Planning details are still being developed.', question: form.question.trim(),
      hypothesis: form.exploratory ? undefined : form.hypothesis.trim(), exploratory: form.exploratory, variedFactor: form.factor.trim(), measuredOutcome: form.outcome.trim(), controls: form.controls.trim(), schedule: form.schedule.trim(), status: 'planning',
      conditions: conditionNames.map((name, index) => ({ id: uid('condition'), name, description: '', colour: ['#BEC8D1', '#86CECB', '#E12885', '#137A7F'][index % 4] })),
      variables: form.outcome.trim() ? [{ id: uid('variable'), name: form.outcome.trim(), unit: form.unit.trim(), role: 'outcome' }] : [],
      methodRevisions: [{ id: methodId, version: 1, changeReason: 'Initial method definition created during experiment setup.', title: `${form.title.trim()} method`, steps: form.procedure.split('\n').map((item) => item.trim()).filter(Boolean), equipment: form.equipment.trim(), notes: '', createdAt: now }],
      specimens: [], runs: [], measurements: [], analyses: [], notes: [], attachments: [], conclusion: '', limitations: '', followUp: '', dataRevision: 1, createdAt: now, updatedAt: now,
    };
    if (await commit((current) => ({ ...current, experiments: [...current.experiments, experiment] }))) navigate(`/experiments/${id}/overview`);
  };
  return <div className="page setup-page"><header className="page-header"><div><Link className="back-link" to={requestedProjectId ? `/projects/${form.projectId}` : '/experiments'}><ArrowLeft size={16} /> {requestedProjectId ? workspace.projects.find((item) => item.id === form.projectId)?.name ?? 'Project' : 'Experiments'}</Link><h1>Create an experiment</h1><p>Start capturing when you are ready. Incomplete planning is highlighted but does not make measurements invalid.</p></div></header>
    <div className="setup-progress">{steps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <Check size={15} /> : index + 1}</span>{label}</button>)}</div>
    <Panel className="setup-panel">
      {step === 0 && <div className="form-stack"><div><p className="step-label">Step 1 of 3</p><h2>What are you investigating?</h2><p className="muted">A clear question is useful, but only the title is required to create the workspace.</p></div><Field label="Experiment title"><input autoFocus value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Surface finish and evaporation" /></Field><Field label="Research question" hint="Phrase the specific comparison you want to observe."><textarea value={form.question} onChange={(event) => set('question', event.target.value)} rows={3} /></Field><label className="check-row"><input type="checkbox" checked={form.exploratory} onChange={(event) => set('exploratory', event.target.checked)} /><span><strong>This is exploratory</strong><small>No directional hypothesis is required.</small></span></label>{!form.exploratory && <Field label="Hypothesis"><textarea value={form.hypothesis} onChange={(event) => set('hypothesis', event.target.value)} rows={3} /></Field>}<Field label="Project"><select value={form.projectId} onChange={(event) => set('projectId', event.target.value)}>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field></div>}
      {step === 1 && <div className="form-stack"><div><p className="step-label">Step 2 of 3</p><h2>Define the comparison</h2></div><div className="form-grid"><Field label="What are you changing?"><input value={form.factor} onChange={(event) => set('factor', event.target.value)} placeholder="One deliberately varied factor" /></Field><Field label="What are you measuring?"><input value={form.outcome} onChange={(event) => set('outcome', event.target.value)} placeholder="Primary numerical outcome" /></Field><Field label="Measurement unit"><input value={form.unit} onChange={(event) => set('unit', event.target.value)} placeholder="e.g. °C, V, cm" /></Field></div><Field label="Conditions" hint="One condition per line. Specimens or groups can be assigned after creation."><textarea value={form.conditions} onChange={(event) => set('conditions', event.target.value)} rows={5} /></Field><Field label="What stays controlled or should be recorded as context?"><textarea value={form.controls} onChange={(event) => set('controls', event.target.value)} rows={3} /></Field></div>}
      {step === 2 && <div className="form-stack"><div><p className="step-label">Step 3 of 3</p><h2>Outline the procedure</h2></div><Field label="Equipment and context"><textarea value={form.equipment} onChange={(event) => set('equipment', event.target.value)} rows={3} /></Field><Field label="Ordered steps" hint="One step per line. You can create revisions later."><textarea value={form.procedure} onChange={(event) => set('procedure', event.target.value)} rows={7} /></Field><Field label="When will measurements be taken?"><input value={form.schedule} onChange={(event) => set('schedule', event.target.value)} /></Field>{error && <p className="form-error">{error}</p>}</div>}
      <div className="form-actions"><Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> Back</Button>{step < 2 ? <Button variant="primary" onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight size={17} /></Button> : <Button variant="primary" onClick={() => void create()}><Plus size={17} /> Create experiment</Button>}</div>
    </Panel>
  </div>;
}
