import { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { validateRun } from '../domain/runs';
import type { Experiment, Run } from '../types';
import { browserTimeZone, localDateTimeInputValueWithSeconds, uid } from '../utils/files';
import { Button, Field, Modal } from './ui';

export function RunEditorModal({ experiment, run, onClose }: { experiment: Experiment; run?: Run; onClose: () => void }) {
  const { updateExperiment } = useWorkspace();
  const editing = Boolean(run);
  const [status, setStatus] = useState<Run['status']>(run?.status ?? 'planned');
  const [error, setError] = useState('');
  const measuredSpecimenIds = new Set(run ? experiment.measurements.filter((measurement) => measurement.runId === run.id).map((measurement) => measurement.specimenId) : []);
  const save = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const started = new Date(String(data.get('startedAt')));
    const completed = status === 'complete' ? new Date(String(data.get('completedAt'))) : undefined;
    const candidate: Run = {
      id: run?.id ?? uid('run'),
      name: String(data.get('name')).trim(),
      specimenIds: data.getAll('specimens').map(String),
      methodRevisionId: String(data.get('methodRevisionId')),
      startedAt: Number.isFinite(started.getTime()) ? started.toISOString() : '',
      completedAt: completed && Number.isFinite(completed.getTime()) ? completed.toISOString() : undefined,
      status,
      cycle: Math.max(1, Number(data.get('cycle')) || 1),
      deviations: String(data.get('deviations')).trim(),
      deviationImpact: String(data.get('deviationImpact')) as Run['deviationImpact'],
      operator: String(data.get('operator')).trim() || undefined,
      instrumentIds: data.getAll('instruments').map(String),
    };
    const issues = validateRun(experiment, candidate, run);
    if (issues.length) { setError(issues.join(' ')); return; }
    const saved = await updateExperiment(experiment.id, (current) => ({
      ...current,
      runs: editing ? current.runs.map((item) => item.id === candidate.id ? candidate : item) : [...current.runs, candidate],
      status: !editing && current.status === 'planning' ? 'in-progress' : current.status,
      updatedAt: new Date().toISOString(),
    }), editing ? undefined : { systemReason: 'Procedure execution added; experiment status updated automatically when required.' });
    if (saved) onClose();
  };
  return <Modal title={editing ? `Edit ${run!.name}` : 'Add procedure execution'} onClose={onClose} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
    {editing && <p className="muted">Saving changed values creates the next run version. OpenBench will require a reason before the update is committed.</p>}
    <div className="form-grid"><Field label="Run identity"><input name="name" required defaultValue={run?.name ?? `Run ${experiment.runs.length + 1}`} onChange={() => setError('')} /></Field><Field label="Start date and time" hint={`Interpreted in browser time zone: ${browserTimeZone()}.`}><input name="startedAt" type="datetime-local" step="1" required defaultValue={localDateTimeInputValueWithSeconds(run ? new Date(run.startedAt) : undefined)} onChange={() => setError('')} /></Field><Field label="Method revision" hint={measuredSpecimenIds.size ? 'Locked because this run has measurements. Validate the recorded revision instead of relinking the run.' : undefined}><select name="methodRevisionId" defaultValue={run?.methodRevisionId} disabled={measuredSpecimenIds.size > 0}>{experiment.methodRevisions.map((method) => <option key={method.id} value={method.id}>v{method.version} — {method.title}</option>)}</select>{measuredSpecimenIds.size > 0 && <input type="hidden" name="methodRevisionId" value={run?.methodRevisionId} />}</Field><Field label="Status"><select name="status" value={status} onChange={(event) => { setStatus(event.target.value as Run['status']); setError(''); }}><option value="planned">Planned</option><option value="running">Running</option><option value="complete">Complete</option></select></Field><Field label="Cycle number" hint="Use this to identify repeated cycles on the same specimen."><input name="cycle" type="number" min="1" defaultValue={run?.cycle ?? 1} onChange={() => setError('')} /></Field>{status === 'complete' && <Field label="Completion date and time" hint={`Interpreted in browser time zone: ${browserTimeZone()}.`}><input name="completedAt" type="datetime-local" step="1" required defaultValue={localDateTimeInputValueWithSeconds(run?.completedAt ? new Date(run.completedAt) : new Date())} onChange={() => setError('')} /></Field>}</div>
    <fieldset><legend>Associated specimens</legend><div className="check-grid">{experiment.specimens.map((specimen) => {
      const locked = measuredSpecimenIds.has(specimen.id);
      return <label className="check-row simple" key={specimen.id}><input type="checkbox" name="specimens" value={specimen.id} defaultChecked={run?.specimenIds.includes(specimen.id)} disabled={locked} onChange={() => setError('')} />{locked && <input type="hidden" name="specimens" value={specimen.id} />}<span>{specimen.name}<small>{experiment.conditions.find((item) => item.id === specimen.conditionId)?.name}{locked ? ' · locked because this run has measurements' : ''}</small></span></label>;
    })}</div></fieldset>
    <div className="form-grid"><Field label="Operator/recorder"><input name="operator" defaultValue={run?.operator} /></Field><Field label="Deviation impact"><select name="deviationImpact" defaultValue={run?.deviationImpact ?? (run?.deviations ? 'unknown' : 'none')}><option value="none">None</option><option value="unknown">Unknown</option><option value="minor">Minor</option><option value="material">Material to interpretation</option></select></Field></div>{experiment.instruments?.length ? <fieldset><legend>Instrument configuration used</legend><div className="check-grid">{experiment.instruments.map((instrument) => <label className="check-row simple" key={instrument.id}><input type="checkbox" name="instruments" value={instrument.id} defaultChecked={run?.instrumentIds?.includes(instrument.id)} /><span>{instrument.name}<small>{instrument.model || instrument.sensorType}</small></span></label>)}</div></fieldset> : <p className="muted">No structured instruments are available. Add them from the experiment overview.</p>}<Field label="Execution-specific deviations" hint="Record what differed from the selected method revision and classify its interpretation impact."><textarea name="deviations" rows={4} defaultValue={run?.deviations} onChange={() => setError('')} placeholder="Record deviations from the selected method revision." /></Field>
    {error && <p className="form-error revision-validation" role="alert">{error}</p>}
    <div className="form-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{editing ? 'Save run changes' : 'Add run'}</Button></div>
  </form></Modal>;
}
