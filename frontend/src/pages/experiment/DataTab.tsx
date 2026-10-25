import { AlertTriangle, FileClock, History, Plus, Save, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CsvImportModal } from '../../components/CsvImportModal';
import { ExperimentChart } from '../../components/ExperimentChart';
import { MeasurementAuditModal } from '../../components/MeasurementAuditModal';
import { Button, Field, Modal, Panel, SortableHeader, StatusBadge } from '../../components/ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import { reviseMeasurement, snapshotMeasurement } from '../../domain/measurements';
import type { Measurement, QualityStatus } from '../../types';
import { formatDateTime, uid } from '../../utils/files';
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
      const saved = await updateExperiment(experiment.id, (current) => reviseMeasurement(current, selected.id, desired, reason));
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
    const measurement: Measurement = { id: uid('measurement'), specimenId: specimenRecord.id, runId, conditionId: specimenRecord.conditionId, elapsed: experiment.kind === 'plant' ? undefined : Number(point), observedAt: experiment.kind === 'plant' ? point : undefined, values: { [variable.id]: value }, quality: String(data.get('quality')) as QualityStatus, notes: String(data.get('notes')), corrections: [], revisions: [], recordedAt: new Date().toISOString() };
    if (await updateExperiment(experiment.id, (current) => ({ ...current, measurements: [...current.measurements, measurement], dataRevision: current.dataRevision + 1, status: current.status === 'planning' ? 'in-progress' : current.status, updatedAt: new Date().toISOString() }))) { setSelectedId(measurement.id); setAddOpen(false); }
  };
  const selectedSpecimen = selected && experiment.specimens.find((item) => item.id === selected.specimenId);
  const selectedRun = selected && experiment.runs.find((item) => item.id === selected.runId);
  const original = selected?.corrections[0]?.previousValue;

  return <><div className="data-actions"><div><strong>{experiment.measurements.length} readings</strong><span> · {experiment.measurements.filter((item) => item.quality === 'review').length} need review · revision {experiment.dataRevision}</span></div><div><Button onClick={() => setImportOpen(true)}><Upload size={16} /> Import CSV</Button><Button variant="primary" onClick={() => setAddOpen(true)} disabled={!experiment.runs.length || !experiment.specimens.length}><Plus size={16} /> Add reading</Button></div></div>
    <Panel className="filter-bar data-filters"><Field label="Condition"><select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="all">All conditions</option>{experiment.conditions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Specimen"><select value={specimen} onChange={(event) => setSpecimen(event.target.value)}><option value="all">All specimens</option>{experiment.specimens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Run"><select value={run} onChange={(event) => setRun(event.target.value)}><option value="all">All runs</option>{experiment.runs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Quality"><select value={quality} onChange={(event) => setQuality(event.target.value)}><option value="all">All quality states</option><option value="valid">Valid</option><option value="review">Needs review</option></select></Field></Panel>
    <div className="data-layout"><Panel title={<h2>Measurements</h2>} className="measurement-panel"><div className="table-scroll measurement-scroll"><table className="measurement-table"><thead><tr>{header('run', 'Run')}{header('condition', 'Condition')}{header('specimen', 'Specimen')}{header('point', experiment.kind === 'plant' ? 'Observation date' : 'Elapsed', true)}{header('value', `${variable.name} (${variable.unit})`, true)}{header('quality', 'Quality')}{header('notes', 'Notes')}</tr></thead><tbody ref={tableRef}>{rows.map((measurement, index) => <tr data-row tabIndex={0} key={measurement.id} className={measurement.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(measurement.id)} onKeyDown={(event) => keyboardSelect(event, index)}><td>{experiment.runs.find((item) => item.id === measurement.runId)?.name}</td><td><span className="condition-label"><i style={{ background: experiment.conditions.find((item) => item.id === measurement.conditionId)?.colour }} />{experiment.conditions.find((item) => item.id === measurement.conditionId)?.name}</span></td><td>{experiment.specimens.find((item) => item.id === measurement.specimenId)?.name}</td><td className="numeric">{measurement.elapsed !== undefined ? `${measurement.elapsed}` : measurement.observedAt}</td><td className={`numeric value-cell ${measurement.quality === 'review' ? 'flagged' : ''}`}>{measurement.values[variable.id] ?? '—'}{(measurement.corrections.length > 0 || measurement.revisions?.length) && <FileClock size={14} aria-label="Revised" />}</td><td><StatusBadge tone={measurement.quality === 'review' ? 'warning' : 'success'}>{measurement.quality === 'review' ? 'Review' : 'Valid'}</StatusBadge></td><td>{measurement.notes || '—'}</td></tr>)}</tbody></table></div><footer className="table-footer"><span>{rows.length} matching readings</span><span>Arrow keys move the selected row. Values are aligned by unit.</span></footer></Panel>
      <aside className="reading-inspector">{selected ? <><Panel title={<h2>Selected reading</h2>} action={(selected.corrections.length > 0 || selected.revisions?.length) && <Button variant="ghost" onClick={() => setAuditOpen(true)}><History size={16} /> Audit trail</Button>}><dl className="detail-list compact"><div><dt>Specimen</dt><dd>{selectedSpecimen?.name}</dd></div><div><dt>Run</dt><dd>{selectedRun?.name}</dd></div><div><dt>{selected.elapsed !== undefined ? 'Elapsed time' : 'Observation date'}</dt><dd>{selected.elapsed !== undefined ? `${selected.elapsed}` : selected.observedAt}</dd></div><div><dt>Recorded</dt><dd>{formatDateTime(selected.recordedAt)}</dd></div></dl><hr /><div className="form-stack compact"><Field label={`${variable.name} (${variable.unit})`} hint={original !== undefined ? `Originally recorded value: ${original} ${variable.unit}` : 'Numerical changes preserve the previous value.'}><input type="number" step="any" value={replacement} onChange={(event) => { setReplacement(event.target.value); setRevisionError(''); }} /></Field><Field label="Quality status"><select value={detailQuality} onChange={(event) => { setDetailQuality(event.target.value as QualityStatus); setRevisionError(''); }}><option value="valid">Valid</option><option value="review">Needs review</option></select></Field><Field label="Notes"><textarea rows={3} value={detailNotes} onChange={(event) => { setDetailNotes(event.target.value); setRevisionError(''); }} /></Field><div className="measurement-revision-requirement"><History /><span><strong>Revision note required</strong><small>Explain why any value, quality, or note change is being made.</small></span></div><Field label="Revision note" hint="Stored with immutable before and after snapshots."><textarea rows={3} value={reason} onChange={(event) => { setReason(event.target.value); setRevisionError(''); }} placeholder="Why is this measurement being changed?" required /></Field>{revisionError && <p className="form-error revision-validation" role="alert">{revisionError}</p>}<div className="button-row"><Button variant="primary" disabled={!hasDraftChanges} onClick={() => void saveRevision()}><Save size={16} /> Save measurement revision</Button>{(selected.corrections.length > 0 || selected.revisions?.length) && <Button onClick={() => setAuditOpen(true)}><FileClock size={16} /> Compare history</Button>}</div></div></Panel><Panel title={<h2>Context</h2>}><ExperimentChart experiment={experiment} variableId={variable.id} selectedMeasurementId={selected.id} compact /></Panel></> : <Panel><p>Select a measurement to inspect its recorded context and revision history.</p></Panel>}</aside>
    </div>
    {addOpen && <Modal title="Add measurement" onClose={() => setAddOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void addReading(event.currentTarget); }}><Field label="Specimen"><select name="specimen">{experiment.specimens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Run"><select name="run">{experiment.runs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label={experiment.kind === 'plant' ? 'Observation date' : 'Elapsed time'}><input name="point" required type={experiment.kind === 'plant' ? 'date' : 'number'} min={experiment.kind === 'plant' ? undefined : '0'} step="any" /></Field><Field label={`${variable.name} (${variable.unit})`}><input name="value" required type="number" step="any" /></Field><Field label="Quality"><select name="quality"><option value="valid">Valid</option><option value="review">Needs review</option></select></Field><Field label="Notes"><textarea name="notes" rows={3} /></Field><div className="form-actions"><Button type="button" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Add reading</Button></div></form></Modal>}
    {importOpen && <CsvImportModal experiment={experiment} onClose={() => setImportOpen(false)} onCommit={(measurements) => updateExperiment(experiment.id, (current) => ({ ...current, measurements: [...current.measurements, ...measurements], dataRevision: current.dataRevision + 1, updatedAt: new Date().toISOString() }))} />}
    {auditOpen && selected && <MeasurementAuditModal measurement={selected} variables={experiment.variables} onClose={() => setAuditOpen(false)} />}
  </>;
}
