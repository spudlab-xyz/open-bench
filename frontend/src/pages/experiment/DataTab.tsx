import { AlertTriangle, FileClock, History, Plus, Save, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CsvImportModal } from '../../components/CsvImportModal';
import { ExperimentChart } from '../../components/ExperimentChart';
import { MeasurementAuditModal } from '../../components/MeasurementAuditModal';
import { VersionAuditButton } from '../../components/VersionAudit';
import { Button, Field, Modal, Panel, SortableHeader, StatusBadge } from '../../components/ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import { reviseMeasurement, snapshotMeasurement } from '../../domain/measurements';
import type { Measurement, MissingObservation, QualityStatus } from '../../types';
import { browserTimeZone, formatDateTime, uid } from '../../utils/files';
import { ELAPSED_TIME_UNIT, explicitUnit, formatMeasurementPoint, formatValueWithUnit } from '../../utils/units';
import type { ExperimentTabProps } from './ExperimentPage';

type SortKey = 'point' | 'condition' | 'specimen' | 'run' | 'value' | 'quality' | 'notes';

export function DataTab({ experiment }: ExperimentTabProps) {
  const { updateExperiment } = useWorkspace();
  const variable = experiment.variables.find((item) => item.role === 'outcome');
  const [condition, setCondition] = useState('all');
  const [specimen, setSpecimen] = useState('all');
  const [run, setRun] = useState('all');
  const [quality, setQuality] = useState('all');
  const [sort, setSort] = useState<SortKey>('point');
  const [descending, setDescending] = useState(false);
  const [selectedId, setSelectedId] = useState(experiment.measurements[0]?.id ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [reason, setReason] = useState('');
  const [revisionError, setRevisionError] = useState('');
  const [detailNotes, setDetailNotes] = useState('');
  const [detailQuality, setDetailQuality] = useState<QualityStatus>('valid');
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const selected = experiment.measurements.find((item) => item.id === selectedId);

  useEffect(() => {
    if (selected && variable) {
      setReplacement(String(selected.values[variable.id] ?? ''));
      setReason('');
      setRevisionError('');
      setDetailNotes(selected.notes);
      setDetailQuality(selected.quality);
    }
  }, [selectedId, selected?.values, selected?.notes, selected?.quality, variable]);

  const rows = useMemo(() => {
    const filtered = experiment.measurements.filter((measurement) => (condition === 'all' || measurement.conditionId === condition) && (specimen === 'all' || measurement.specimenId === specimen) && (run === 'all' || measurement.runId === run) && (quality === 'all' || measurement.quality === quality));
    const valueFor = (measurement: Measurement): string | number => {
      if (sort === 'point') return measurement.elapsed ?? measurement.observedAt ?? '';
      if (sort === 'condition') return experiment.conditions.find((item) => item.id === measurement.conditionId)?.name ?? '';
      if (sort === 'specimen') return experiment.specimens.find((item) => item.id === measurement.specimenId)?.name ?? '';
      if (sort === 'run') return experiment.runs.find((item) => item.id === measurement.runId)?.name ?? '';
      if (sort === 'value') return variable && typeof measurement.values[variable.id] === 'number' ? measurement.values[variable.id]! : Number.NEGATIVE_INFINITY;
      if (sort === 'quality') return measurement.quality;
      return measurement.notes;
    };
    return filtered.sort((left, right) => String(valueFor(left)).localeCompare(String(valueFor(right)), undefined, { numeric: true }) * (descending ? -1 : 1));
  }, [experiment, condition, specimen, run, quality, sort, descending, variable]);

  if (!variable) return <Panel><p>No measured outcome is defined. Add one in experiment planning before capturing numerical data.</p></Panel>;
  const hasExplicitUnit = Boolean(variable.unit.trim());
  const variableUnit = explicitUnit(variable.unit);
  const chooseSort = (key: SortKey) => { if (sort === key) setDescending((value) => !value); else { setSort(key); setDescending(false); } };
  const header = (key: SortKey, label: string, numeric = false) => <SortableHeader active={sort === key} direction={descending ? 'desc' : 'asc'} onSort={() => chooseSort(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  const keyboardSelect = (event: React.KeyboardEvent<HTMLTableRowElement>, index: number) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const target = Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    setSelectedId(rows[target].id);
    tableRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')[target]?.focus();
  };
  const replacementNumber = replacement.trim() === '' ? Number.NaN : Number(replacement);
  const hasDraftChanges = Boolean(selected) && (replacementNumber !== selected!.values[variable.id] || detailQuality !== selected!.quality || detailNotes !== selected!.notes);
  const saveRevision = async () => {
    if (!selected) return;
    if (!Number.isFinite(replacementNumber)) { setRevisionError('Enter a numeric measured value. Blanks are not converted to zero.'); return; }
    if (!reason.trim()) { setRevisionError('A measurement revision note is required.'); return; }
    const desired = snapshotMeasurement(selected);
    desired.values[variable.id] = replacementNumber;
    desired.quality = detailQuality;
    desired.notes = detailNotes;
    try {
      const saved = await updateExperiment(experiment.id, (current) => reviseMeasurement(current, selected.id, desired, reason), { reason });
      if (saved) { setReason(''); setRevisionError(''); }
    } catch (error) { setRevisionError(error instanceof Error ? error.message : 'Measurement revision failed.'); }
  };
  const addReading = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const specimenRecord = experiment.specimens.find((item) => item.id === data.get('specimen'))!;
    const runId = String(data.get('run'));
    const point = String(data.get('point'));
    if (!specimenRecord || !experiment.runs.find((item) => item.id === runId)?.specimenIds.includes(specimenRecord.id)) return;
    const duplicate = experiment.measurements.some((item) => item.specimenId === specimenRecord.id && item.runId === runId && (experiment.kind === 'plant' ? item.observedAt === point : item.elapsed === Number(point)));
    if (duplicate) { alert('A reading already exists for this specimen, run and time/date.'); return; }
    const value = Number(data.get('value'));
    if (!Number.isFinite(value)) { alert('Enter a numeric measured value. Blanks are not converted to zero.'); return; }
    const quality = String(data.get('quality')) as QualityStatus;
    const acquiredInput = String(data.get('acquiredAt') ?? '');
    const acquiredAt = acquiredInput ? new Date(acquiredInput).toISOString() : undefined;
    const measurement: Measurement = { id: uid('measurement'), specimenId: specimenRecord.id, runId, conditionId: specimenRecord.conditionId, elapsed: experiment.kind === 'plant' ? undefined : Number(point), observedAt: experiment.kind === 'plant' ? point : undefined, values: { [variable.id]: value }, quality, qualityReason: String(data.get('qualityReason')).trim(), qualityReviewedBy: String(data.get('qualityReviewedBy')).trim() || undefined, notes: String(data.get('notes')), corrections: [], revisions: [], recordedAt: new Date().toISOString(), context: { acquisitionMethod: String(data.get('acquisitionMethod')) as NonNullable<Measurement['context']>['acquisitionMethod'], sourceId: String(data.get('sourceId') || '') || undefined, sourceObservationId: String(data.get('sourceObservationId')).trim() || undefined, operator: String(data.get('operator')).trim() || undefined, acquiredAt, originalTimestamp: String(data.get('originalTimestamp')).trim() || undefined, timeZone: browserTimeZone(), clockAssumption: String(data.get('clockAssumption')).trim() || undefined, instrumentId: String(data.get('instrumentId') || '') || undefined, calibrationId: String(data.get('calibrationId') || '') || undefined, samplingInterval: String(data.get('samplingInterval')).trim() || undefined, collectionMethod: String(data.get('collectionMethod')).trim() || undefined, location: String(data.get('location')).trim() || undefined, locationPrecision: String(data.get('locationPrecision')).trim() || undefined }, valueMetadata: { [variable.id]: { kind: String(data.get('valueKind')) as NonNullable<Measurement['valueMetadata']>[string]['kind'], uncertainty: optionalNumber(data.get('uncertainty')), precision: optionalNumber(data.get('precision')), detectionLimit: optionalNumber(data.get('detectionLimit')) } } };
    if (quality !== 'valid' && !measurement.qualityReason) { alert('Explain the non-valid quality state.'); return; }
    if (await updateExperiment(experiment.id, (current) => ({ ...current, measurements: [...current.measurements, measurement], missingObservations: current.missingObservations?.filter((item) => !(item.specimenId === measurement.specimenId && item.runId === measurement.runId && item.variableId === variable.id && item.expectedPoint === (measurement.elapsed ?? measurement.observedAt))), dataRevision: current.dataRevision + 1, status: current.status === 'planning' ? 'in-progress' : current.status, updatedAt: new Date().toISOString() }), { systemReason: 'Measurement added; any matching expected-missing marker was resolved and the experiment data revision updated automatically.' })) { setSelectedId(measurement.id); setAddOpen(false); }
  };
  const addMissingObservation = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const specimenId = String(data.get('specimen'));
    const specimenRecord = experiment.specimens.find((item) => item.id === specimenId);
    const runId = String(data.get('run'));
    if (!specimenRecord || !experiment.runs.find((item) => item.id === runId)?.specimenIds.includes(specimenId)) { alert('Choose a run associated with the selected specimen.'); return; }
    const point = String(data.get('point'));
    const expectedPoint = experiment.kind === 'plant' ? point : Number(point);
    if (experiment.missingObservations?.some((item) => item.specimenId === specimenId && item.runId === runId && item.variableId === variable.id && item.expectedPoint === expectedPoint)) { alert('This expected observation is already recorded as missing.'); return; }
    const observation: MissingObservation = { id: uid('missing'), specimenId, runId, variableId: variable.id, expectedPoint, reason: String(data.get('reason')) as MissingObservation['reason'], notes: String(data.get('notes')).trim(), recordedAt: new Date().toISOString() };
    if (await updateExperiment(experiment.id, (current) => ({ ...current, missingObservations: [...(current.missingObservations ?? []), observation], dataRevision: current.dataRevision + 1, updatedAt: observation.recordedAt }), { systemReason: 'Expected observation recorded explicitly as missing; data revision updated automatically.' })) setMissingOpen(false);
  };
  const selectedSpecimen = selected && experiment.specimens.find((item) => item.id === selected.specimenId);
  const selectedRun = selected && experiment.runs.find((item) => item.id === selected.runId);
  const original = selected?.corrections[0]?.previousValue;

  return <>{!hasExplicitUnit && <div className="validation-box danger"><AlertTriangle />The measured outcome has no unit. Specify a unit, or explicitly use “dimensionless”, before adding or revising measurements.</div>}<div className="data-actions"><div><strong>{experiment.measurements.length} readings</strong><span> · {experiment.measurements.filter((item) => item.quality !== 'valid').length} flagged · {experiment.missingObservations?.length ?? 0} explicitly missing · revision {experiment.dataRevision}</span></div><div><Button onClick={() => setMissingOpen(true)} disabled={!hasExplicitUnit || !experiment.runs.length || !experiment.specimens.length}>Record missing</Button><Button onClick={() => setImportOpen(true)} disabled={!hasExplicitUnit}><Upload size={16} /> Import CSV</Button><Button variant="primary" onClick={() => setAddOpen(true)} disabled={!hasExplicitUnit || !experiment.runs.length || !experiment.specimens.length}><Plus size={16} /> Add reading</Button></div></div>
    <Panel className="filter-bar data-filters"><Field label="Condition"><select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="all">All conditions</option>{experiment.conditions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Specimen"><select value={specimen} onChange={(event) => setSpecimen(event.target.value)}><option value="all">All specimens</option>{experiment.specimens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Run"><select value={run} onChange={(event) => setRun(event.target.value)}><option value="all">All runs</option>{experiment.runs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quality"><select value={quality} onChange={(event) => setQuality(event.target.value)}><option value="all">All quality states</option>{(['valid', 'review', 'suspect', 'invalid', 'below-detection', 'estimated'] as QualityStatus[]).map((item) => <option key={item} value={item}>{qualityLabel(item)}</option>)}</select></Field></Panel>
    {Boolean(experiment.missingObservations?.length) && <Panel title={<h2>Explicitly missing observations</h2>}><div className="missing-observation-list">{experiment.missingObservations?.map((observation) => <div key={observation.id}><span><strong>{experiment.specimens.find((item) => item.id === observation.specimenId)?.name}</strong><small>{typeof observation.expectedPoint === 'number' ? formatMeasurementPoint(observation.expectedPoint, false) : observation.expectedPoint} · {observation.reason}</small>{observation.notes && <small>{observation.notes}</small>}</span><VersionAuditButton entityType="missing observation" entityId={observation.id} label="Missing observation" compact /></div>)}</div></Panel>}
    <div className="data-layout"><Panel title={<h2>Measurements</h2>} className="measurement-panel"><div className="table-scroll measurement-scroll"><table className="measurement-table"><thead><tr>{header('run', 'Run')}{header('condition', 'Condition')}{header('specimen', 'Specimen')}{header('point', experiment.kind === 'plant' ? 'Observation date' : `Elapsed time (${ELAPSED_TIME_UNIT})`, true)}{header('value', `${variable.name} (${variableUnit})`, true)}{header('quality', 'Quality')}{header('notes', 'Notes')}</tr></thead><tbody ref={tableRef}>{rows.map((measurement, index) => <tr data-row tabIndex={0} key={measurement.id} className={measurement.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(measurement.id)} onKeyDown={(event) => keyboardSelect(event, index)}><td>{experiment.runs.find((item) => item.id === measurement.runId)?.name}</td><td><span className="condition-label"><i style={{ background: experiment.conditions.find((item) => item.id === measurement.conditionId)?.colour }} />{experiment.conditions.find((item) => item.id === measurement.conditionId)?.name}</span></td><td>{experiment.specimens.find((item) => item.id === measurement.specimenId)?.name}</td><td className="numeric">{measurement.elapsed !== undefined ? formatValueWithUnit(measurement.elapsed, ELAPSED_TIME_UNIT) : measurement.observedAt}</td><td className={`numeric value-cell ${measurement.quality !== 'valid' ? 'flagged' : ''}`}>{typeof measurement.values[variable.id] === 'number' ? formatValueWithUnit(measurement.values[variable.id]!, variableUnit) : '—'}{(measurement.corrections.length > 0 || measurement.revisions?.length) && <FileClock size={14} aria-label="Revised" />}</td><td><StatusBadge tone={measurement.quality === 'valid' ? 'success' : measurement.quality === 'invalid' ? 'danger' : 'warning'}>{qualityLabel(measurement.quality)}</StatusBadge></td><td>{measurement.notes || '—'}</td></tr>)}</tbody></table></div><footer className="table-footer"><span>{rows.length} matching readings</span><span>Arrow keys move the selected row. Every numerical value states its unit.</span></footer></Panel>
      <aside className="reading-inspector">{selected ? <><Panel title={<h2>Selected reading</h2>} action={<span className="inline-audit-actions"><VersionAuditButton entityType="measurement" entityId={selected.id} label={`Measurement ${selected.id}`} compact />{(selected.corrections.length > 0 || selected.revisions?.length) && <Button variant="ghost" onClick={() => setAuditOpen(true)}><History size={16} /> Data audit</Button>}</span>}><dl className="detail-list compact"><div><dt>Specimen</dt><dd>{selectedSpecimen?.name}</dd></div><div><dt>Run</dt><dd>{selectedRun?.name}</dd></div><div><dt>{selected.elapsed !== undefined ? `Elapsed time (${ELAPSED_TIME_UNIT})` : 'Observation date'}</dt><dd>{selected.elapsed !== undefined ? formatMeasurementPoint(selected.elapsed, false) : selected.observedAt}</dd></div><div><dt>Recorded</dt><dd>{formatDateTime(selected.recordedAt)}</dd></div><div><dt>Value kind</dt><dd>{selected.valueMetadata?.[variable.id]?.kind ?? 'Unspecified'}</dd></div><div><dt>Acquisition</dt><dd>{selected.context?.acquisitionMethod ?? 'Unknown'}{selected.context?.instrumentId ? ` · ${experiment.instruments?.find((item) => item.id === selected.context?.instrumentId)?.name ?? selected.context.instrumentId}` : ''}</dd></div><div><dt>Source</dt><dd>{experiment.sources?.find((item) => item.id === selected.context?.sourceId)?.name ?? selected.context?.sourceObservationId ?? 'Not linked'}</dd></div></dl>{selected.qualityReason && <p className="validation-box warning"><AlertTriangle />{selected.qualityReason}</p>}<hr /><div className="form-stack compact"><Field label={`${variable.name} (${variableUnit})`} hint={original !== undefined ? `Originally recorded value: ${formatValueWithUnit(original, variableUnit)}` : 'Numerical changes preserve the previous value.'}><input type="number" step="any" value={replacement} onChange={(event) => { setReplacement(event.target.value); setRevisionError(''); }} /></Field><Field label="Quality status"><select value={detailQuality} onChange={(event) => { setDetailQuality(event.target.value as QualityStatus); setRevisionError(''); }}>{(['valid', 'review', 'suspect', 'invalid', 'below-detection', 'estimated'] as QualityStatus[]).map((item) => <option key={item} value={item}>{qualityLabel(item)}</option>)}</select></Field><Field label="Notes"><textarea rows={3} value={detailNotes} onChange={(event) => { setDetailNotes(event.target.value); setRevisionError(''); }} /></Field><div className="measurement-revision-requirement"><History /><span><strong>Revision note required</strong><small>Explain why any value, quality, or note change is being made. Affected analyses and conclusions become stale.</small></span></div><Field label="Revision note" hint="Stored with immutable before and after snapshots."><textarea rows={3} value={reason} onChange={(event) => { setReason(event.target.value); setRevisionError(''); }} placeholder="Why is this measurement being changed?" required /></Field>{revisionError && <p className="form-error revision-validation" role="alert">{revisionError}</p>}<div className="button-row"><Button variant="primary" disabled={!hasExplicitUnit || !hasDraftChanges} onClick={() => void saveRevision()}><Save size={16} /> Save measurement revision</Button>{(selected.corrections.length > 0 || selected.revisions?.length) && <Button onClick={() => setAuditOpen(true)}><FileClock size={16} /> Compare history</Button>}</div></div></Panel><Panel title={<h2>Context</h2>}><ExperimentChart experiment={experiment} variableId={variable.id} selectedMeasurementId={selected.id} compact /></Panel></> : <Panel><p>Select a measurement to inspect its recorded context and revision history.</p></Panel>}</aside>
    </div>
    {addOpen && <Modal title="Add measurement" onClose={() => setAddOpen(false)} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void addReading(event.currentTarget); }}><div className="form-grid"><Field label="Specimen"><select name="specimen">{experiment.specimens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Run"><select name="run">{experiment.runs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label={experiment.kind === 'plant' ? 'Observation date' : `Elapsed time (${ELAPSED_TIME_UNIT})`}><input name="point" required type={experiment.kind === 'plant' ? 'date' : 'number'} min={experiment.kind === 'plant' ? undefined : '0'} step="any" /></Field><Field label={`${variable.name} (${variableUnit})`}><input name="value" required type="number" step="any" /></Field><Field label="Value kind"><select name="valueKind"><option value="raw-observation">Raw observation</option><option value="corrected-observation">Corrected observation</option><option value="derived">Derived value</option><option value="estimate">Estimate</option><option value="forecast">Forecast</option></select></Field><Field label="Quality"><select name="quality"><option value="valid">Valid under recorded checks</option><option value="review">Needs review</option><option value="suspect">Suspect</option><option value="invalid">Invalid</option><option value="below-detection">Below detection limit</option><option value="estimated">Estimated</option></select></Field><Field label="Uncertainty"><input name="uncertainty" type="number" step="any" min="0" /></Field><Field label="Recorded precision (decimal places)"><input name="precision" type="number" step="1" min="0" /></Field><Field label="Detection limit"><input name="detectionLimit" type="number" step="any" /></Field><Field label="Acquisition method"><select name="acquisitionMethod"><option value="manual">Manual</option><option value="instrument">Instrument</option><option value="provider">Provider</option><option value="legacy-unknown">Unknown</option></select></Field><Field label="Source"><select name="sourceId"><option value="">Not linked</option>{experiment.sources?.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></Field><Field label="Source observation ID"><input name="sourceObservationId" /></Field><Field label="Operator/recorder"><input name="operator" /></Field><Field label="Acquired at" hint={`Browser zone: ${browserTimeZone()}`}><input name="acquiredAt" type="datetime-local" /></Field><Field label="Original timestamp text"><input name="originalTimestamp" /></Field><Field label="Clock assumption"><input name="clockAssumption" /></Field><Field label="Instrument"><select name="instrumentId"><option value="">Not linked</option>{experiment.instruments?.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.name}</option>)}</select></Field><Field label="Calibration"><select name="calibrationId"><option value="">Not linked</option>{experiment.calibrations?.map((calibration) => <option key={calibration.id} value={calibration.id}>{experiment.instruments?.find((item) => item.id === calibration.instrumentId)?.name} · {calibration.result}</option>)}</select></Field><Field label="Sampling interval"><input name="samplingInterval" /></Field><Field label="Collection method"><input name="collectionMethod" /></Field><Field label="Location"><input name="location" /></Field><Field label="Location precision"><input name="locationPrecision" /></Field></div><div className="form-grid"><Field label="Quality rationale"><textarea name="qualityReason" rows={2} /></Field><Field label="Quality reviewer"><input name="qualityReviewedBy" /></Field></div><Field label="Notes"><textarea name="notes" rows={3} /></Field><div className="form-actions"><Button type="button" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Add reading</Button></div></form></Modal>}
    {missingOpen && <Modal title="Record expected observation as missing" onClose={() => setMissingOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void addMissingObservation(event.currentTarget); }}><Field label="Specimen"><select name="specimen">{experiment.specimens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Run"><select name="run">{experiment.runs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label={experiment.kind === 'plant' ? 'Expected observation date' : `Expected elapsed time (${ELAPSED_TIME_UNIT})`}><input name="point" required type={experiment.kind === 'plant' ? 'date' : 'number'} min={experiment.kind === 'plant' ? undefined : '0'} /></Field><Field label="Missing reason"><select name="reason"><option value="not-collected">Not collected</option><option value="instrument-failure">Instrument failure</option><option value="not-applicable">Not applicable</option><option value="below-detection">Below detection limit</option><option value="lost-sample">Lost sample</option><option value="unknown">Unknown</option></select></Field><Field label="Notes"><textarea name="notes" rows={3} /></Field><div className="form-actions"><Button type="button" onClick={() => setMissingOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Record missing observation</Button></div></form></Modal>}
    {importOpen && <CsvImportModal experiment={experiment} onClose={() => setImportOpen(false)} onCommit={({ measurements, source, importRecord }) => updateExperiment(experiment.id, (current) => ({ ...current, measurements: [...current.measurements, ...measurements], sources: [...(current.sources ?? []), source], imports: [...(current.imports ?? []), importRecord], dataRevision: current.dataRevision + 1, updatedAt: new Date().toISOString() }), { systemReason: `${measurements.length} measurements imported from validated CSV with retained source provenance; data revision updated automatically.` })} />}
    {auditOpen && selected && <MeasurementAuditModal measurement={selected} variables={experiment.variables} onClose={() => setAuditOpen(false)} />}
  </>;
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function qualityLabel(quality: QualityStatus): string {
  return ({ valid: 'Valid under recorded checks', review: 'Needs review', suspect: 'Suspect', invalid: 'Invalid', 'below-detection': 'Below detection limit', estimated: 'Estimated' })[quality];
}
