import { ArrowDown, ArrowUp, BookMarked, Eye, GitCompareArrows, History, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Modal, Panel, StatusBadge } from '../../components/ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import { compareMethodRevisions, hasMethodContentChanges } from '../../domain/methodRevisions';
import type { MethodRevision } from '../../types';
import { formatDateTime, uid } from '../../utils/files';
import type { ExperimentTabProps } from './ExperimentPage';

export function MethodTab({ experiment }: ExperimentTabProps) {
  const { updateExperiment, commit, workspace } = useWorkspace();
  const revisions = useMemo(() => [...experiment.methodRevisions].sort((left, right) => left.version - right.version), [experiment.methodRevisions]);
  const latest = revisions.at(-1);
  const [steps, setSteps] = useState(latest?.steps ?? []);
  const [equipment, setEquipment] = useState(latest?.equipment ?? '');
  const [notes, setNotes] = useState(latest?.notes ?? '');
  const [title, setTitle] = useState(latest?.title ?? `${experiment.title} method`);
  const [changeReason, setChangeReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [inspectedRevision, setInspectedRevision] = useState<MethodRevision | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [fromRevisionId, setFromRevisionId] = useState(revisions.at(-2)?.id ?? revisions[0]?.id ?? '');
  const [toRevisionId, setToRevisionId] = useState(latest?.id ?? '');

  useEffect(() => {
    setSteps(latest?.steps ?? []);
    setEquipment(latest?.equipment ?? '');
    setNotes(latest?.notes ?? '');
    setTitle(latest?.title ?? `${experiment.title} method`);
  }, [latest?.id, experiment.title]);

  useEffect(() => {
    setFromRevisionId((current) => revisions.some((item) => item.id === current) ? current : revisions.at(-2)?.id ?? revisions[0]?.id ?? '');
    setToRevisionId((current) => revisions.some((item) => item.id === current) ? current : latest?.id ?? '');
  }, [latest?.id, revisions]);

  const createRevision = async () => {
    const draft = {
      title: title.trim() || `${experiment.title} method`,
      steps: steps.map((step) => step.trim()).filter(Boolean),
      equipment: equipment.trim(),
      notes: notes.trim(),
    };
    if (!changeReason.trim()) {
      setValidationError('Describe why this method revision is needed. The reason becomes part of its audit trail.');
      return;
    }
    if (latest && !hasMethodContentChanges(latest, draft)) {
      setValidationError('Change the method title, ordered steps, equipment, or notes before creating a new revision. Execution deviations belong on runs.');
      return;
    }
    const revision: MethodRevision = {
      id: uid('method'),
      version: (latest?.version ?? 0) + 1,
      basedOnRevisionId: latest?.id,
      changeReason: changeReason.trim(),
      ...draft,
      createdAt: new Date().toISOString(),
    };
    const saved = await updateExperiment(experiment.id, (current) => ({ ...current, methodRevisions: [...current.methodRevisions, revision], updatedAt: revision.createdAt }));
    if (saved) {
      setChangeReason('');
      setValidationError('');
      setFromRevisionId(latest?.id ?? revision.id);
      setToRevisionId(revision.id);
    }
  };

  const saveForReuse = async () => {
    if (!latest || !workspace || workspace.savedMethods.some((item) => item.id === latest.id)) return;
    await commit((current) => ({ ...current, savedMethods: [...current.savedMethods, structuredClone(latest)] }));
  };

  const move = (index: number, direction: -1 | 1) => setSteps((current) => {
    const next = [...current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const openComparisonFrom = (revision: MethodRevision) => {
    const index = revisions.findIndex((item) => item.id === revision.id);
    setFromRevisionId(revision.id);
    setToRevisionId(revisions[index + 1]?.id ?? latest?.id ?? revision.id);
    setInspectedRevision(null);
    setCompareOpen(true);
  };

  const fromRevision = revisions.find((item) => item.id === fromRevisionId);
  const toRevision = revisions.find((item) => item.id === toRevisionId);
  const comparison = fromRevision && toRevision ? compareMethodRevisions(fromRevision, toRevision) : null;

  return <div className="method-layout"><div className="method-editor"><Panel title={<div><h2>Procedure editor</h2><p className="panel-subtitle">Saving creates an immutable revision. Earlier runs retain the exact revision they used.</p></div>} action={<Button onClick={() => void saveForReuse()} disabled={!latest || workspace?.savedMethods.some((item) => item.id === latest.id)}><BookMarked size={16} /> {workspace?.savedMethods.some((item) => item.id === latest?.id) ? 'Saved for reuse' : 'Save for reuse'}</Button>}>
    <div className="form-stack"><Field label="Method title"><input value={title} onChange={(event) => { setTitle(event.target.value); setValidationError(''); }} /></Field><div><span className="field-label">Ordered steps</span><div className="step-editor">{steps.map((step, index) => <div className="editable-step" key={index}><span>{index + 1}</span><textarea aria-label={`Step ${index + 1}`} rows={2} value={step} onChange={(event) => { setSteps((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item)); setValidationError(''); }} /><div><button aria-label="Move step up" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp /></button><button aria-label="Move step down" onClick={() => move(index, 1)} disabled={index === steps.length - 1}><ArrowDown /></button><button aria-label="Delete step" onClick={() => { setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index)); setValidationError(''); }}><Trash2 /></button></div></div>)}</div><Button className="add-inline" onClick={() => { setSteps((current) => [...current, '']); setValidationError(''); }}><Plus size={16} /> Add step</Button></div><Field label="Equipment"><textarea rows={4} value={equipment} onChange={(event) => { setEquipment(event.target.value); setValidationError(''); }} /></Field><Field label="Contextual notes"><textarea rows={3} value={notes} onChange={(event) => { setNotes(event.target.value); setValidationError(''); }} /></Field>
      <div className="revision-requirement"><History /><div><strong>Revision reason is required</strong><p>Explain why the procedure changed. OpenBench calculates what changed from the immutable snapshots and keeps this rationale alongside it.</p></div></div>
      <Field label={`Why is revision ${(latest?.version ?? 0) + 1} needed?`} hint="Required. Be specific enough for a future reviewer to understand the decision."><textarea rows={3} value={changeReason} onChange={(event) => { setChangeReason(event.target.value); setValidationError(''); }} placeholder="For example: Increase stabilisation time after pilot runs showed the probe had not equilibrated." required /></Field>
      {validationError && <p className="form-error revision-validation" role="alert">{validationError}</p>}
      <div className="form-actions"><Button variant="primary" onClick={() => void createRevision()}><Save size={16} /> Save as revision {(latest?.version ?? 0) + 1}</Button></div></div>
  </Panel></div><aside><Panel title={<h2>Revision audit trail</h2>} action={<Button onClick={() => setCompareOpen(true)} disabled={revisions.length < 2}><GitCompareArrows size={16} /> Compare</Button>}><div className="revision-list">{[...revisions].reverse().map((revision) => {
    const runCount = experiment.runs.filter((run) => run.methodRevisionId === revision.id).length;
    const isLatest = revision.id === latest?.id;
    return <div className="revision-card" key={revision.id}><span className="revision-number">v{revision.version}</span><span className="revision-card-copy"><span className="revision-card-title"><strong>{revision.title}</strong>{isLatest && <StatusBadge tone="info">Latest</StatusBadge>}</span><small>{formatDateTime(revision.createdAt)} · {revision.steps.length} steps · {runCount} run{runCount === 1 ? '' : 's'} used this revision</small><span className={revision.changeReason ? 'revision-reason' : 'revision-reason revision-reason-missing'}>{revision.changeReason || 'No change reason recorded for this legacy revision.'}</span><span className="revision-card-actions"><Button variant="ghost" onClick={() => setInspectedRevision(revision)}><Eye size={15} /> Inspect</Button>{revisions.length > 1 && <Button variant="ghost" onClick={() => openComparisonFrom(revision)}><GitCompareArrows size={15} /> Compare</Button>}</span></span></div>;
  })}</div></Panel><Panel title={<h2>Revision safety</h2>}><p className="muted">Method revisions are immutable once recorded. Creating a revision never rewrites the procedure associated with an earlier execution.</p></Panel></aside>

  {inspectedRevision && <Modal title={`Method revision ${inspectedRevision.version}`} onClose={() => setInspectedRevision(null)} wide><div className="revision-inspector"><div className="revision-audit-header"><span className="revision-number">v{inspectedRevision.version}</span><div><h3>{inspectedRevision.title}</h3><p>{formatDateTime(inspectedRevision.createdAt)} · {experiment.runs.filter((run) => run.methodRevisionId === inspectedRevision.id).length} recorded run uses this revision</p></div></div><div className={inspectedRevision.changeReason ? 'audit-reason' : 'audit-reason audit-reason-missing'}><strong>Why this revision was created</strong><p>{inspectedRevision.changeReason || 'No reason was captured for this legacy revision.'}</p></div><div className="revision-detail-grid"><section><h3>Ordered procedure</h3><ol className="method-steps">{inspectedRevision.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></section><section><h3>Equipment</h3><p>{inspectedRevision.equipment || 'No equipment recorded.'}</p><h3>Contextual notes</h3><p>{inspectedRevision.notes || 'No contextual notes recorded.'}</p><h3>Audit link</h3><p>{inspectedRevision.basedOnRevisionId ? `Based on revision ${revisions.find((item) => item.id === inspectedRevision.basedOnRevisionId)?.version ?? 'unknown'}.` : 'Initial or legacy revision; no predecessor link recorded.'}</p></section></div><div className="form-actions"><Button onClick={() => openComparisonFrom(inspectedRevision)} disabled={revisions.length < 2}><GitCompareArrows size={16} /> Compare revisions</Button><Button variant="primary" onClick={() => setInspectedRevision(null)}>Close</Button></div></div></Modal>}

  {compareOpen && <Modal title="Compare method revisions" onClose={() => setCompareOpen(false)} wide><div className="revision-comparison"><div className="comparison-selectors"><Field label="Earlier snapshot"><select value={fromRevisionId} onChange={(event) => setFromRevisionId(event.target.value)}>{revisions.map((revision) => <option key={revision.id} value={revision.id}>Revision {revision.version} — {revision.title}</option>)}</select></Field><GitCompareArrows /><Field label="Later snapshot"><select value={toRevisionId} onChange={(event) => setToRevisionId(event.target.value)}>{revisions.map((revision) => <option key={revision.id} value={revision.id}>Revision {revision.version} — {revision.title}</option>)}</select></Field></div>{fromRevision && toRevision && comparison && <><div className="comparison-summary"><div><small>Comparing</small><strong>v{fromRevision.version} → v{toRevision.version}</strong></div><div><small>Changed sections</small><strong>{comparison.changedSections}</strong></div><div className="comparison-rationale"><small>Reason recorded on v{toRevision.version}</small><strong>{toRevision.changeReason || 'No reason recorded for this legacy revision.'}</strong></div></div><div className="comparison-fields"><ComparisonField label="Method title" before={comparison.title.before} after={comparison.title.after} changed={comparison.title.changed} /><ComparisonField label="Equipment" before={comparison.equipment.before} after={comparison.equipment.after} changed={comparison.equipment.changed} /><ComparisonField label="Contextual notes" before={comparison.notes.before} after={comparison.notes.after} changed={comparison.notes.changed} /></div><section className="step-comparison"><h3>Ordered procedure changes</h3><div className="step-comparison-head"><span>Position</span><span>Revision {fromRevision.version}</span><span>Revision {toRevision.version}</span><span>Change</span></div>{comparison.steps.map((step) => <div className={`step-comparison-row step-${step.status}`} key={step.position}><span>{step.position}</span><span>{step.before || '—'}</span><span>{step.after || '—'}</span><span><StatusBadge tone={step.status === 'unchanged' ? 'neutral' : step.status === 'added' ? 'success' : step.status === 'removed' ? 'danger' : 'warning'}>{step.status}</StatusBadge></span></div>)}</section></>}</div></Modal>}
  </div>;
}

function ComparisonField({ label, before, after, changed }: { label: string; before: string; after: string; changed: boolean }) {
  return <section className={changed ? 'comparison-field changed' : 'comparison-field'}><header><h3>{label}</h3><StatusBadge tone={changed ? 'warning' : 'neutral'}>{changed ? 'Changed' : 'Unchanged'}</StatusBadge></header><div><span><small>Before</small><p>{before || 'Not recorded'}</p></span><span><small>After</small><p>{after || 'Not recorded'}</p></span></div></section>;
}
