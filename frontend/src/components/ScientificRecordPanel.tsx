import { AlertTriangle, BadgeCheck, Database, Gauge, Pencil, Plus, Scale, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { scientificReadinessIssues, scientificReviewTargetId, scientificReviewTargetOptions } from '../domain/scientific';
import type { CalibrationRecord, DataSource, Experiment, Instrument, PermissionStatus, ReviewDecision, ScientificReview, ValidationEvidence } from '../types';
import { formatDateTime, localDateTimeInputValueWithSeconds, uid } from '../utils/files';
import { Button, Field, Modal, Panel, StatusBadge } from './ui';
import { VersionAuditButton } from './VersionAudit';

type RecordKind = 'context' | 'source' | 'instrument' | 'calibration' | 'evidence' | 'review';

export function ScientificRecordPanel({ experiment }: { experiment: Experiment }) {
  const { updateExperiment } = useWorkspace();
  const [editing, setEditing] = useState<RecordKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reviewScope, setReviewScope] = useState<ScientificReview['scope']>('experiment');
  const [reviewTargetId, setReviewTargetId] = useState('');
  const issues = scientificReadinessIssues(experiment);
  const selectedSource = experiment.sources?.find((item) => item.id === editingId);
  const selectedInstrument = experiment.instruments?.find((item) => item.id === editingId);
  const selectedCalibration = experiment.calibrations?.find((item) => item.id === editingId);
  const selectedEvidence = experiment.validationEvidence?.find((item) => item.id === editingId);
  const selectedReview = experiment.scientificReviews?.find((item) => item.id === editingId);
  const openEditor = (kind: RecordKind, id?: string) => {
    setError('');
    setEditingId(id ?? null);
    if (kind === 'review') {
      const review = experiment.scientificReviews?.find((item) => item.id === id);
      setReviewScope(review?.scope ?? 'experiment');
      setReviewTargetId(review?.targetId ?? '');
    }
    setEditing(kind);
  };
  const closeEditor = () => { setEditing(null); setEditingId(null); setError(''); };
  const save = async (form: HTMLFormElement) => {
    if (!editing) return;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const optionalText = (name: string, previous?: string) => text(name) || (previous === '' ? '' : undefined);
    const isoDate = (name: string, previous?: string) => {
      const value = text(name);
      if (!value) return undefined;
      return previous && dateTimeInputValue(previous) === value ? previous : new Date(value).toISOString();
    };
    const attachmentIds = (previous: string[] = []) => {
      const selected = data.getAll('attachments').map(String);
      return sameValues(selected, previous) ? previous : selected;
    };
    const now = new Date().toISOString();
    if (editing === 'context') {
      const intendedUse = text('intendedUse');
      const useLimitations = text('useLimitations');
      if (!intendedUse || !useLimitations) { setError('Record both intended use and conditions where results should not be used.'); return; }
      if (await updateExperiment(experiment.id, (current) => ({ ...current, intendedUse, useLimitations, updatedAt: now }))) closeEditor();
      return;
    }
    if (editing === 'source') {
      const name = text('name');
      if (!name) { setError('Give the source a name.'); return; }
      const source: DataSource = { id: editingId ?? uid('source'), name, kind: text('kind') as DataSource['kind'], provider: optionalText('provider', selectedSource?.provider), datasetId: optionalText('datasetId', selectedSource?.datasetId), stationId: optionalText('stationId', selectedSource?.stationId), sourceUri: optionalText('sourceUri', selectedSource?.sourceUri), retrievedAt: isoDate('retrievedAt', selectedSource?.retrievedAt), licence: optionalText('licence', selectedSource?.licence), attribution: optionalText('attribution', selectedSource?.attribution), permissionStatus: text('permissionStatus') as PermissionStatus, permissionNote: optionalText('permissionNote', selectedSource?.permissionNote) };
      if (await updateExperiment(experiment.id, (current) => ({ ...current, sources: upsert(current.sources, source), updatedAt: now }))) closeEditor();
      return;
    }
    if (editing === 'instrument') {
      const name = text('name');
      if (!name || !text('sensorType')) { setError('Record an instrument name and sensor/type.'); return; }
      const instrument: Instrument = { id: editingId ?? uid('instrument'), name, sensorType: text('sensorType'), manufacturer: optionalText('manufacturer', selectedInstrument?.manufacturer), model: optionalText('model', selectedInstrument?.model), serialNumber: optionalText('serialNumber', selectedInstrument?.serialNumber), resolution: optionalText('resolution', selectedInstrument?.resolution), location: optionalText('location', selectedInstrument?.location), notes: optionalText('notes', selectedInstrument?.notes) };
      if (await updateExperiment(experiment.id, (current) => ({ ...current, instruments: upsert(current.instruments, instrument), updatedAt: now }))) closeEditor();
      return;
    }
    if (editing === 'calibration') {
      if (!text('instrumentId') || !text('calibratedAt') || !text('procedure')) { setError('Choose an instrument and record the calibration date and procedure.'); return; }
      const calibration: CalibrationRecord = { id: editingId ?? uid('calibration'), instrumentId: text('instrumentId'), calibratedAt: isoDate('calibratedAt', selectedCalibration?.calibratedAt)!, validUntil: isoDate('validUntil', selectedCalibration?.validUntil), procedure: text('procedure'), result: text('result') as CalibrationRecord['result'], coefficients: optionalText('coefficients', selectedCalibration?.coefficients), responsiblePerson: optionalText('responsiblePerson', selectedCalibration?.responsiblePerson), evidenceAttachmentIds: attachmentIds(selectedCalibration?.evidenceAttachmentIds), notes: optionalText('notes', selectedCalibration?.notes) };
      if (await updateExperiment(experiment.id, (current) => ({ ...current, calibrations: upsert(current.calibrations, calibration), updatedAt: now }))) closeEditor();
      return;
    }
    if (editing === 'evidence') {
      if (!text('title') || !text('summary')) { setError('Give the evidence a title and summary.'); return; }
      const evidence: ValidationEvidence = { id: editingId ?? uid('evidence'), title: text('title'), kind: text('kind') as ValidationEvidence['kind'], summary: text('summary'), result: text('result') as ValidationEvidence['result'], conditions: text('conditions'), limitations: text('limitations'), recordedAt: selectedEvidence?.recordedAt ?? now, attachmentIds: attachmentIds(selectedEvidence?.attachmentIds) };
      if (await updateExperiment(experiment.id, (current) => ({ ...current, validationEvidence: upsert(current.validationEvidence, evidence), updatedAt: now }))) closeEditor();
      return;
    }
    const reviewer = text('reviewer');
    if (!reviewer || !text('comments')) { setError('Record the reviewer and review comments.'); return; }
    const scope = text('scope') as ScientificReview['scope'];
    const targetId = scientificReviewTargetId(experiment, scope, text('targetId'));
    if (!targetId) { setError(`Choose the ${scope} record this review addresses.`); return; }
    const reviewContent = { scope, targetId, reviewer, decision: text('decision') as ReviewDecision, comments: text('comments'), dataRevision: experiment.dataRevision };
    const reviewChanged = !selectedReview || Object.entries(reviewContent).some(([key, value]) => selectedReview[key as keyof ScientificReview] !== value);
    const review: ScientificReview = { id: editingId ?? uid('review'), ...reviewContent, reviewedAt: reviewChanged ? now : selectedReview.reviewedAt };
    if (await updateExperiment(experiment.id, (current) => ({ ...current, scientificReviews: upsert(current.scientificReviews, review), updatedAt: now }))) closeEditor();
  };

  return <><Panel className="scientific-record-panel" title={<div><h2><ShieldCheck /> Scientific record</h2><p className="panel-subtitle">Provenance, instruments, calibration, validation and review remain linked to this experiment.</p></div>} action={<div className="button-row"><Button onClick={() => openEditor('context')}>Intended use</Button><Button onClick={() => openEditor('source')}><Plus size={15} /> Source</Button><Button onClick={() => openEditor('instrument')}><Plus size={15} /> Instrument</Button></div>}>
    <div className="scientific-readiness"><div className={issues.length ? 'readiness-score has-issues' : 'readiness-score ready'}><Gauge /><span><strong>{issues.length ? `${issues.length} readiness issue${issues.length === 1 ? '' : 's'}` : 'Ready for review'}</strong><small>{issues.length ? 'Resolve or explicitly acknowledge these before releasing a report.' : 'No automated readiness issues detected.'}</small></span></div>{issues.length > 0 && <ul>{issues.map((issue) => <li key={issue}><AlertTriangle size={14} /> {issue}</li>)}</ul>}</div>
    <div className="scientific-record-grid"><section><header><Database /><strong>Sources</strong><Button variant="ghost" onClick={() => openEditor('source')}>Add</Button></header>{experiment.sources?.length ? experiment.sources.map((source) => <div className="scientific-record-row" key={source.id}><span><strong>{source.name}</strong><small>{source.kind} · permissions {source.permissionStatus}</small>{source.attribution && <small>Attribution: {source.attribution}</small>}</span><span className="scientific-record-actions"><Button variant="ghost" onClick={() => openEditor('source', source.id)}><Pencil size={14} /> Edit</Button><VersionAuditButton entityType="data source" entityId={source.id} label={source.name} compact /></span></div>) : <p className="muted">No source provenance recorded.</p>}{experiment.imports?.map((record) => <details className="scientific-import-record" key={record.id}><summary>{record.filename} · {record.acceptedRows.length} accepted · {record.rejectedRows.length} rejected</summary><small>{record.fileHash}</small><p>Mapping: {JSON.stringify(record.mapping)}</p>{record.rejectedRows.length > 0 && <ul>{record.rejectedRows.map((row) => <li key={row.rowNumber}>Row {row.rowNumber}: {row.issues.join(' ')}</li>)}</ul>}<details><summary>Inspect retained raw rows</summary><pre>{JSON.stringify(record.rawRows, null, 2)}</pre></details></details>)}</section>
      <section><header><Scale /><strong>Instruments & calibration</strong><span><Button variant="ghost" onClick={() => openEditor('instrument')}>Instrument</Button><Button variant="ghost" onClick={() => openEditor('calibration')} disabled={!experiment.instruments?.length}>Calibration</Button></span></header>{experiment.instruments?.length ? experiment.instruments.map((instrument) => { const calibrations = [...(experiment.calibrations ?? [])].filter((item) => item.instrumentId === instrument.id).sort((left, right) => right.calibratedAt.localeCompare(left.calibratedAt)); return <div className="scientific-instrument-record" key={instrument.id}><div className="scientific-record-row"><span><strong>{instrument.name}</strong><small>{instrument.sensorType}{instrument.model ? ` · ${instrument.model}` : ''}{instrument.serialNumber ? ` · S/N ${instrument.serialNumber}` : ''}</small>{!calibrations.length && <small>No calibration recorded</small>}</span><span className="scientific-record-actions"><Button variant="ghost" onClick={() => openEditor('instrument', instrument.id)}><Pencil size={14} /> Edit</Button><VersionAuditButton entityType="instrument" entityId={instrument.id} label={instrument.name} compact /></span></div>{calibrations.map((calibration) => <div className="scientific-calibration-row" key={calibration.id}><span><strong>Calibration {calibration.result}</strong><small>{formatDateTime(calibration.calibratedAt)}{calibration.validUntil ? ` · valid until ${formatDateTime(calibration.validUntil)}` : ''}</small></span><span className="scientific-record-actions"><Button variant="ghost" onClick={() => openEditor('calibration', calibration.id)}><Pencil size={14} /> Edit</Button><VersionAuditButton entityType="calibration" entityId={calibration.id} label={`${instrument.name} calibration`} compact /></span></div>)}</div>; }) : <p className="muted">No structured instruments recorded.</p>}</section>
      <section><header><BadgeCheck /><strong>Validation & review</strong><span><Button variant="ghost" onClick={() => openEditor('evidence')}>Evidence</Button><Button variant="ghost" onClick={() => openEditor('review')}>Review</Button></span></header>{experiment.validationEvidence?.map((evidence) => <div className="scientific-record-row" key={evidence.id}><span><strong>{evidence.title}</strong><small>{evidence.kind} · {evidence.result}</small></span><span className="scientific-record-actions"><Button variant="ghost" onClick={() => openEditor('evidence', evidence.id)}><Pencil size={14} /> Edit</Button><VersionAuditButton entityType="validation evidence" entityId={evidence.id} label={evidence.title} compact /></span></div>)}{experiment.scientificReviews?.map((review) => <div className="scientific-record-row" key={review.id}><span><strong>{review.scope} review</strong><small>{review.reviewer} · {review.decision} · data revision {review.dataRevision}</small></span><span className="scientific-record-actions"><StatusBadge tone={review.decision === 'approved' ? 'success' : review.decision === 'pending' ? 'neutral' : 'warning'}>{review.decision}</StatusBadge><Button variant="ghost" onClick={() => openEditor('review', review.id)}><Pencil size={14} /> Edit</Button><VersionAuditButton entityType="scientific review" entityId={review.id} label={`${review.scope} review`} compact /></span></div>)}{!experiment.validationEvidence?.length && !experiment.scientificReviews?.length && <p className="muted">No validation evidence or scientific review recorded.</p>}</section></div>
  </Panel>
  {editing && <Modal title={modalTitle(editing, Boolean(editingId))} onClose={closeEditor} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
    {editing === 'context' && <><Field label="Intended use"><textarea name="intendedUse" rows={3} defaultValue={experiment.intendedUse} /></Field><Field label="Conditions and limitations of use"><textarea name="useLimitations" rows={4} defaultValue={experiment.useLimitations} /></Field></>}
    {editing === 'source' && <><div className="form-grid"><Field label="Source name"><input name="name" required defaultValue={selectedSource?.name} /></Field><Field label="Capture/source kind"><select name="kind" defaultValue={selectedSource?.kind ?? 'manual'}><option value="manual">Manual</option><option value="csv">CSV file</option><option value="instrument">Instrument</option><option value="provider">External provider</option><option value="calculated">Calculated</option><option value="legacy-unknown">Legacy / unknown</option></select></Field><Field label="Provider"><input name="provider" defaultValue={selectedSource?.provider} /></Field><Field label="Dataset identifier"><input name="datasetId" defaultValue={selectedSource?.datasetId} /></Field><Field label="Station identifier"><input name="stationId" defaultValue={selectedSource?.stationId} /></Field><Field label="Source URL"><input name="sourceUri" type="url" defaultValue={selectedSource?.sourceUri} /></Field><Field label="Retrieved at"><input name="retrievedAt" type="datetime-local" step="1" defaultValue={dateTimeInputValue(selectedSource?.retrievedAt)} /></Field><Field label="Licence"><input name="licence" defaultValue={selectedSource?.licence} /></Field></div><Field label="Required attribution"><textarea name="attribution" rows={2} defaultValue={selectedSource?.attribution} /></Field><Field label="Permission review"><select name="permissionStatus" defaultValue={selectedSource?.permissionStatus ?? 'not-reviewed'}><option value="not-reviewed">Not reviewed</option><option value="permitted">Permitted</option><option value="restricted">Restricted</option><option value="prohibited">Prohibited</option></select></Field><Field label="Permission and redistribution note"><textarea name="permissionNote" rows={3} defaultValue={selectedSource?.permissionNote} /></Field><p className="validation-box warning"><AlertTriangle /> Importing or processing data does not grant permission to redistribute it.</p></>}
    {editing === 'instrument' && <><div className="form-grid"><Field label="Instrument name"><input name="name" required defaultValue={selectedInstrument?.name} /></Field><Field label="Sensor/type"><input name="sensorType" required defaultValue={selectedInstrument?.sensorType} /></Field><Field label="Manufacturer"><input name="manufacturer" defaultValue={selectedInstrument?.manufacturer} /></Field><Field label="Model"><input name="model" defaultValue={selectedInstrument?.model} /></Field><Field label="Serial number"><input name="serialNumber" defaultValue={selectedInstrument?.serialNumber} /></Field><Field label="Resolution/precision"><input name="resolution" defaultValue={selectedInstrument?.resolution} /></Field><Field label="Location"><input name="location" defaultValue={selectedInstrument?.location} /></Field></div><Field label="Instrument notes"><textarea name="notes" rows={3} defaultValue={selectedInstrument?.notes} /></Field></>}
    {editing === 'calibration' && <><div className="form-grid"><Field label="Instrument"><select name="instrumentId" defaultValue={selectedCalibration?.instrumentId}>{experiment.instruments?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Calibrated at"><input name="calibratedAt" type="datetime-local" step="1" required defaultValue={dateTimeInputValue(selectedCalibration?.calibratedAt)} /></Field><Field label="Valid until"><input name="validUntil" type="datetime-local" step="1" defaultValue={dateTimeInputValue(selectedCalibration?.validUntil)} /></Field><Field label="Result"><select name="result" defaultValue={selectedCalibration?.result ?? 'passed'}><option value="passed">Passed</option><option value="limited">Limited</option><option value="failed">Failed</option><option value="unknown">Unknown</option></select></Field><Field label="Responsible person"><input name="responsiblePerson" defaultValue={selectedCalibration?.responsiblePerson} /></Field><Field label="Coefficients/correction function"><input name="coefficients" defaultValue={selectedCalibration?.coefficients} /></Field></div><Field label="Calibration procedure"><textarea name="procedure" rows={3} required defaultValue={selectedCalibration?.procedure} /></Field><AttachmentChecks experiment={experiment} selectedIds={selectedCalibration?.evidenceAttachmentIds} /><Field label="Notes"><textarea name="notes" rows={2} defaultValue={selectedCalibration?.notes} /></Field></>}
    {editing === 'evidence' && <><div className="form-grid"><Field label="Evidence title"><input name="title" required defaultValue={selectedEvidence?.title} /></Field><Field label="Evidence kind"><select name="kind" defaultValue={selectedEvidence?.kind ?? 'example'}><option value="example">Worked example</option><option value="reference-dataset">Reference dataset</option><option value="tool-comparison">Tool comparison</option><option value="uncertainty-analysis">Uncertainty analysis</option><option value="hardware-test">Hardware test</option><option value="assumption-review">Assumption review</option></select></Field><Field label="Result"><select name="result" defaultValue={selectedEvidence?.result ?? 'not-reviewed'}><option value="not-reviewed">Not reviewed</option><option value="supports-use">Supports intended use</option><option value="limited">Limited support</option><option value="failed">Failed</option></select></Field></div><Field label="Summary"><textarea name="summary" rows={3} required defaultValue={selectedEvidence?.summary} /></Field><Field label="Conditions covered"><textarea name="conditions" rows={2} defaultValue={selectedEvidence?.conditions} /></Field><Field label="Known limitations"><textarea name="limitations" rows={2} defaultValue={selectedEvidence?.limitations} /></Field><AttachmentChecks experiment={experiment} selectedIds={selectedEvidence?.attachmentIds} /></>}
    {editing === 'review' && <><div className="form-grid"><Field label="Review scope"><select name="scope" value={reviewScope} onChange={(event) => { setReviewScope(event.target.value as ScientificReview['scope']); setReviewTargetId(''); setError(''); }}><option value="experiment">Experiment</option><option value="method">Method</option><option value="analysis">Analysis</option><option value="conclusion">Conclusion</option><option value="report">Report</option></select></Field><ReviewTargetField experiment={experiment} scope={reviewScope} targetId={reviewTargetId} existingTargetId={selectedReview?.targetId} onChange={(value) => { setReviewTargetId(value); setError(''); }} /><Field label="Reviewer"><input name="reviewer" required defaultValue={selectedReview?.reviewer} /></Field><Field label="Decision"><select name="decision" defaultValue={selectedReview?.decision ?? 'pending'}><option value="pending">Pending</option><option value="approved">Approved</option><option value="changes-requested">Changes requested</option><option value="rejected">Rejected</option></select></Field></div><Field label="Scientific assumptions and review comments"><textarea name="comments" rows={5} required defaultValue={selectedReview?.comments} /></Field>{selectedReview && <p className="muted">Saving a changed review reassesses it against current data revision {experiment.dataRevision}. The previous version remains in the audit history.</p>}</>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Button type="button" onClick={closeEditor}>Cancel</Button><Button variant="primary" type="submit">{editing === 'context' ? 'Save intended use' : editingId ? 'Save changes' : 'Add scientific record'}</Button></div>
  </form></Modal>}
  </>;
}

function AttachmentChecks({ experiment, selectedIds = [] }: { experiment: Experiment; selectedIds?: string[] }) {
  return experiment.attachments.length ? <fieldset><legend>Supporting attachments</legend><div className="check-grid">{experiment.attachments.map((attachment) => <label className="check-row simple" key={attachment.id}><input type="checkbox" name="attachments" value={attachment.id} defaultChecked={selectedIds.includes(attachment.id)} /><span>{attachment.caption || attachment.name}</span></label>)}</div></fieldset> : <p className="muted">Add supporting files from the Report tab if evidence documents are needed.</p>;
}

function ReviewTargetField({ experiment, scope, targetId, existingTargetId, onChange }: { experiment: Experiment; scope: ScientificReview['scope']; targetId: string; existingTargetId?: string; onChange: (value: string) => void }) {
  if (scope !== 'method' && scope !== 'analysis') {
    const target = scope === 'conclusion' ? 'Current conclusion' : scope === 'report' ? 'Current experiment report' : 'Current experiment';
    return <Field label="Review target" hint="OpenBench links this scope to the current experiment automatically."><input value={target} readOnly /><input type="hidden" name="targetId" value="" /></Field>;
  }
  const options = scientificReviewTargetOptions(experiment, scope);
  const hasExistingUnavailableTarget = Boolean(existingTargetId && targetId === existingTargetId && !options.some((option) => option.id === existingTargetId));
  const article = scope === 'analysis' ? 'an' : 'a';
  return <Field label="Review target" hint={`Choose the exact ${scope} revision reviewed.`}><select name="targetId" required value={targetId} onChange={(event) => onChange(event.target.value)}><option value="">Select {article} {scope} record</option>{hasExistingUnavailableTarget && <option value={existingTargetId}>Previously recorded target (unavailable)</option>}{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>{!options.length && <small className="field-hint">Create and save {article} {scope} record before reviewing it.</small>}</Field>;
}

function modalTitle(kind: RecordKind, editingExisting: boolean): string {
  if (kind === 'context') return 'Intended use and limitations';
  const noun = ({ source: 'observation source', instrument: 'instrument', calibration: 'calibration record', evidence: 'validation evidence', review: 'scientific review' })[kind];
  return `${editingExisting ? 'Edit' : 'Add'} ${noun}`;
}

function upsert<T extends { id: string }>(records: T[] | undefined, record: T): T[] {
  const current = records ?? [];
  return current.some((item) => item.id === record.id)
    ? current.map((item) => item.id === record.id ? record : item)
    : [...current, record];
}

function dateTimeInputValue(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : localDateTimeInputValueWithSeconds(date);
}

function sameValues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}
