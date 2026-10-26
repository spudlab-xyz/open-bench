import { BadgeCheck, History, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { effectiveMethodValidation, identicalMethodRevisionIds, methodAssessmentIsRetrospective, methodProcedureFingerprint, methodValidationLabel } from '../domain/methodValidation';
import type { Experiment, MethodValidationAssessment, MethodValidationDecision } from '../types';
import { localDateTimeInputValueWithSeconds, uid } from '../utils/files';
import { Button, Field, Modal, Panel, StatusBadge } from './ui';
import { VersionAuditButton } from './VersionAudit';

export function MethodValidationPanel({ experiment }: { experiment: Experiment }) {
  const { updateExperiment } = useWorkspace();
  const [targetMethodId, setTargetMethodId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const usedMethodIds = [...new Set(experiment.runs.map((run) => run.methodRevisionId))];
  const latestMethodId = experiment.methodRevisions.at(-1)?.id;
  if (latestMethodId && !usedMethodIds.includes(latestMethodId)) usedMethodIds.push(latestMethodId);
  const targetMethod = experiment.methodRevisions.find((method) => method.id === targetMethodId);
  const selectedAssessment = experiment.methodValidationAssessments?.find((assessment) => assessment.id === assessmentId);
  const identicalIds = targetMethodId ? identicalMethodRevisionIds(experiment, targetMethodId) : [];
  const openAssessment = (methodId: string, existingId?: string) => { setTargetMethodId(methodId); setAssessmentId(existingId ?? null); setError(''); };
  const closeAssessment = () => { setTargetMethodId(null); setAssessmentId(null); setError(''); };
  const save = async (form: HTMLFormElement) => {
    if (!targetMethod) return;
    const data = new FormData(form);
    const reviewer = String(data.get('reviewer') ?? '').trim();
    const rationale = String(data.get('rationale') ?? '').trim();
    const intendedUse = String(data.get('intendedUse') ?? '').trim();
    const limitations = String(data.get('limitations') ?? '').trim();
    const assessedAtInput = String(data.get('assessedAt') ?? '');
    const assessedAt = new Date(assessedAtInput);
    const methodRevisionIds = [...new Set([targetMethod.id, ...data.getAll('methodRevisionIds').map(String)])];
    if (!reviewer || !rationale || !Number.isFinite(assessedAt.getTime())) { setError('Record a reviewer, valid assessment time, and scientific rationale.'); return; }
    if (methodRevisionIds.some((id) => !identicalIds.includes(id))) { setError('Validation can cover only revisions with identical normalized procedure content.'); return; }
    const decision = String(data.get('decision')) as MethodValidationDecision;
    if ((decision === 'validated' || decision === 'limited') && (!intendedUse || !limitations)) { setError('Validated and limited decisions require intended use and limitations.'); return; }
    const assessment: MethodValidationAssessment = {
      id: selectedAssessment?.id ?? uid('method-validation'),
      methodRevisionIds,
      procedureFingerprint: methodProcedureFingerprint(targetMethod),
      decision,
      reviewer,
      assessedAt: assessedAt.toISOString(),
      retrospective: methodAssessmentIsRetrospective(experiment, methodRevisionIds, assessedAt.toISOString(), data.get('retrospective') === 'on'),
      intendedUse,
      limitations,
      evidenceIds: data.getAll('evidenceIds').map(String),
      rationale,
    };
    const saved = await updateExperiment(experiment.id, (current) => ({
      ...current,
      methodValidationAssessments: upsert(current.methodValidationAssessments, assessment),
      updatedAt: new Date().toISOString(),
    }));
    if (saved) closeAssessment();
  };

  return <><Panel title={<div><h2><BadgeCheck /> Method validation</h2><p className="panel-subtitle">Assess the exact immutable procedure used by each run. Validation does not create or replace a procedure revision.</p></div>}>
    <div className="method-validation-list">{usedMethodIds.map((methodId) => {
      const method = experiment.methodRevisions.find((item) => item.id === methodId);
      if (!method) return null;
      const effective = effectiveMethodValidation(experiment, method.id);
      const runIds = experiment.runs.filter((run) => run.methodRevisionId === method.id).map((run) => run.id);
      const measurements = experiment.measurements.filter((measurement) => runIds.includes(measurement.runId)).length;
      return <div className="method-validation-row" key={method.id}><span><strong>v{method.version} — {method.title}</strong><small>{runIds.length} run{runIds.length === 1 ? '' : 's'} · {measurements} measurement{measurements === 1 ? '' : 's'}</small><StatusBadge tone={validationTone(effective.status)}>{methodValidationLabel(effective.status)}</StatusBadge>{effective.assessment?.retrospective && <small>Assessed after execution; report disclosure retained.</small>}</span><span className="scientific-record-actions"><Button variant="ghost" onClick={() => openAssessment(method.id, effective.assessment?.id)}>{effective.assessment ? <><Pencil size={14} /> Edit assessment</> : <><Plus size={14} /> Assess revision</>}</Button>{effective.assessment && <VersionAuditButton entityType="method validation assessment" entityId={effective.assessment.id} label={`Method v${method.version} validation`} compact />}</span></div>;
    })}</div>
    <p className="muted"><History size={14} /> Historical runs keep their original method revision. An assessment may explicitly cover other revisions only when their normalized procedure content is identical.</p>
  </Panel>
  {targetMethod && <Modal title={`${selectedAssessment ? 'Edit' : 'Assess'} validation for method v${targetMethod.version}`} onClose={closeAssessment} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
    <div className="validation-box warning"><BadgeCheck /><span>This assessment targets the recorded procedure; it does not relink runs or rewrite method history.</span></div>
    <div className="form-grid"><Field label="Decision"><select name="decision" defaultValue={selectedAssessment?.decision ?? 'pending'}><option value="pending">Pending</option><option value="validated">Validated for intended use</option><option value="limited">Limited validation</option><option value="failed">Failed validation</option></select></Field><Field label="Reviewer"><input name="reviewer" required defaultValue={selectedAssessment?.reviewer} /></Field><Field label="Assessed at"><input name="assessedAt" type="datetime-local" step="1" required defaultValue={localDateTimeInputValueWithSeconds(selectedAssessment ? new Date(selectedAssessment.assessedAt) : new Date())} /></Field></div>
    <label className="check-row"><input type="checkbox" name="retrospective" defaultChecked={selectedAssessment?.retrospective ?? experiment.runs.some((run) => run.methodRevisionId === targetMethod.id)} /><span><strong>Retrospective assessment</strong><small>The validation decision was made after one or more executions and must remain disclosed in reports.</small></span></label>
    {identicalIds.length > 1 && <fieldset><legend>Explicitly cover identical procedure revisions</legend><div className="check-grid">{identicalIds.map((id) => { const revision = experiment.methodRevisions.find((item) => item.id === id)!; const primary = id === targetMethod.id; return <label className="check-row simple" key={id}><input type="checkbox" name="methodRevisionIds" value={id} disabled={primary} defaultChecked={primary || selectedAssessment?.methodRevisionIds.includes(id)} />{primary && <input type="hidden" name="methodRevisionIds" value={id} />}<span>v{revision.version} — {revision.title}<small>{primary ? 'Assessment target' : 'Procedure fingerprint matches exactly'}</small></span></label>; })}</div></fieldset>}
    <Field label="Intended use"><textarea name="intendedUse" rows={3} defaultValue={selectedAssessment?.intendedUse ?? targetMethod.intendedUse} /></Field><Field label="Limitations and conditions of use"><textarea name="limitations" rows={3} defaultValue={selectedAssessment?.limitations ?? targetMethod.useLimitations} /></Field>
    {experiment.validationEvidence?.length ? <fieldset><legend>Supporting validation evidence</legend><div className="check-grid">{experiment.validationEvidence.map((evidence) => <label className="check-row simple" key={evidence.id}><input type="checkbox" name="evidenceIds" value={evidence.id} defaultChecked={selectedAssessment?.evidenceIds.includes(evidence.id) ?? targetMethod.validationEvidenceIds?.includes(evidence.id)} /><span>{evidence.title}<small>{evidence.result}</small></span></label>)}</div></fieldset> : <p className="muted">No structured validation evidence is available. Add it from the Scientific record first.</p>}
    <Field label="Scientific rationale"><textarea name="rationale" rows={4} required defaultValue={selectedAssessment?.rationale} placeholder="Explain why the evidence supports, limits, or rejects this procedure for the stated use." /></Field>
    {error && <p className="form-error revision-validation" role="alert">{error}</p>}<div className="form-actions"><Button type="button" onClick={closeAssessment}>Cancel</Button><Button variant="primary" type="submit">{selectedAssessment ? 'Save assessment changes' : 'Record assessment'}</Button></div>
  </form></Modal>}
  </>;
}

function upsert<T extends { id: string }>(items: T[] | undefined, item: T): T[] {
  return items?.some((current) => current.id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [...(items ?? []), item];
}

function validationTone(status: ReturnType<typeof effectiveMethodValidation>['status']): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'prospective-validated') return 'success';
  if (status === 'retrospective-validated' || status === 'legacy-approved') return 'info';
  if (status === 'failed') return 'danger';
  return status === 'limited' || status === 'pending' ? 'warning' : 'neutral';
}
