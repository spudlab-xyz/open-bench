import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { Button, Field, Modal, SortableHeader, useSortableRows } from './ui';
import { exampleCsv, parseCsv, previewCsv, type CsvMapping } from '../domain/csv';
import type { Experiment } from '../types';
import type { DataSource, ImportRecord, Measurement } from '../types';
import { downloadText, uid } from '../utils/files';
import { ELAPSED_TIME_UNIT, explicitUnit, formatValueWithUnit } from '../utils/units';

export interface CsvImportCommit {
  measurements: Measurement[];
  source: DataSource;
  importRecord: ImportRecord;
}

export function CsvImportModal({ experiment, onClose, onCommit }: { experiment: Experiment; onClose: () => void; onCommit: (payload: CsvImportCommit) => Promise<boolean> }) {
  const [filename, setFilename] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({ specimen: '', run: '', point: '', value: '', unit: '', notes: '' });
  const [fileHash, setFileHash] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [attribution, setAttribution] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<DataSource['permissionStatus']>('not-reviewed');
  const [permissionAcknowledged, setPermissionAcknowledged] = useState(false);
  const variable = experiment.variables.find((item) => item.role === 'outcome');
  const preview = useMemo(() => parsed && variable && Object.values(mapping).slice(0, 5).every(Boolean) ? previewCsv(experiment, parsed.rows, mapping, variable.unit) : [], [parsed, mapping, experiment, variable]);
  type PreviewSortKey = 'row' | 'specimen' | 'run' | 'point' | 'value' | 'validation';
  const previewSort = useSortableRows<ReturnType<typeof previewCsv>[number], PreviewSortKey>(preview, 'row', (row, key) => {
    if (key === 'row') return row.rowNumber;
    if (key === 'specimen') return row.raw[mapping.specimen];
    if (key === 'run') return row.raw[mapping.run];
    if (key === 'point') return row.raw[mapping.point];
    if (key === 'value') return row.raw[mapping.value];
    return row.issues.length ? row.issues.join(' ') : 'Valid';
  });
  const previewHeader = (key: PreviewSortKey, label: string, numeric = false) => <SortableHeader active={previewSort.sort.key === key} direction={previewSort.sort.direction} onSort={() => previewSort.sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  const valid = preview.flatMap((row) => row.measurement ? [row.measurement] : []);
  const invalidCount = preview.length - valid.length;
  const chooseFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const result = parseCsv(text);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    setFileHash(`sha256-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`);
    setFilename(file.name);
    setSourceName(file.name);
    setParsed(result);
    const find = (...names: string[]) => result.fields.find((field) => names.includes(field.toLowerCase())) ?? '';
    setMapping({ specimen: find('specimen', 'specimen_id', 'plant'), run: find('run', 'run_id'), point: find('elapsed', 'elapsed_minutes', 'observation_date', 'date'), value: find('value', variable?.name.toLowerCase().replaceAll(' ', '_') ?? ''), unit: find('unit'), notes: find('notes') });
  };
  const commit = async () => {
    if (!valid.length || !parsed || !permissionAcknowledged) return;
    const sourceId = uid('source');
    const importedAt = new Date().toISOString();
    const source: DataSource = { id: sourceId, name: sourceName.trim() || filename, kind: 'csv', attribution: attribution.trim(), permissionStatus, permissionNote: 'Importer acknowledged that processing does not grant redistribution permission.' };
    const importRecord: ImportRecord = { id: uid('import'), filename, importedAt, sourceId, fileHash, mapping: { ...mapping }, rawRows: structuredClone(parsed.rows), acceptedRows: preview.filter((row) => row.measurement).map((row) => row.rowNumber), rejectedRows: preview.filter((row) => row.issues.length).map((row) => ({ rowNumber: row.rowNumber, issues: [...row.issues] })), permissionAcknowledged };
    const measurements = valid.map((measurement, index) => ({ ...measurement, context: { acquisitionMethod: 'csv' as const, sourceId, sourceObservationId: `${filename}:row-${importRecord.acceptedRows[index]}`, originalTimestamp: String(preview.find((row) => row.rowNumber === importRecord.acceptedRows[index])?.raw[mapping.point] ?? ''), clockAssumption: experiment.kind === 'plant' ? 'Source supplied a date-only observation.' : 'Source supplied elapsed time; acquisition clock time was not supplied.' }, valueMetadata: Object.fromEntries(Object.keys(measurement.values).map((id) => [id, { kind: 'raw-observation' as const }])) }));
    if (await onCommit({ measurements, source, importRecord })) onClose();
  };
  return <Modal title="Import measurements from CSV" onClose={onClose} wide><div className="import-flow">
    <div className="import-step"><span>1</span><div><h3>Choose a CSV file</h3><p>Quoted fields are supported. Files stay in this browser.</p><div className="button-row"><label className="button button-secondary file-button"><Upload size={16} /> {filename || 'Choose file'}<input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label><Button onClick={() => downloadText(`${experiment.kind}-example.csv`, exampleCsv(experiment), 'text/csv')}><Download size={16} /> Download example</Button></div></div></div>
    {parsed && <><div className="import-step"><span>2</span><div className="grow"><h3>Map columns and assign units</h3>{parsed.parseErrors.length > 0 && <div className="validation-box danger"><AlertTriangle />{parsed.parseErrors.join(' ')}</div>}<div className="mapping-grid">{([['specimen', 'Specimen identity'], ['run', 'Run identity'], ['point', experiment.kind === 'plant' ? 'Observation date' : `Elapsed time (${ELAPSED_TIME_UNIT})`], ['value', variable ? `${variable.name} (${explicitUnit(variable.unit)})` : 'Value (unit not specified)'], ['unit', `Unit (must be ${explicitUnit(variable?.unit)})`], ['notes', 'Notes (optional)']] as const).map(([key, label]) => <Field key={key} label={label}><select value={mapping[key] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}><option value="">Not mapped</option>{parsed.fields.map((field) => <option key={field} value={field}>{field}</option>)}</select></Field>)}</div></div></div>
      <div className="import-step"><span>3</span><div className="grow"><h3>Review before committing</h3><p>{valid.length} valid row{valid.length === 1 ? '' : 's'} ready. {invalidCount} invalid row{invalidCount === 1 ? '' : 's'} will be retained with its validation errors in the import provenance record.</p>{preview.length > 0 && <div className="table-scroll preview-table"><table><thead><tr>{previewHeader('row', 'Row', true)}{previewHeader('specimen', 'Specimen')}{previewHeader('run', 'Run')}{previewHeader('point', experiment.kind === 'plant' ? 'Observation date' : `Elapsed time (${ELAPSED_TIME_UNIT})`)}{previewHeader('value', `${variable?.name ?? 'Value'} (${explicitUnit(variable?.unit)})`, true)}{previewHeader('validation', 'Validation')}</tr></thead><tbody>{previewSort.rows.slice(0, 30).map((row) => <tr key={row.rowNumber} className={row.issues.length ? 'row-invalid' : ''}><td>{row.rowNumber}</td><td>{row.raw[mapping.specimen]}</td><td>{row.raw[mapping.run]}</td><td>{experiment.kind === 'plant' ? row.raw[mapping.point] : formatValueWithUnit(row.raw[mapping.point], ELAPSED_TIME_UNIT)}</td><td>{formatValueWithUnit(row.raw[mapping.value], row.raw[mapping.unit])}</td><td>{row.issues.length ? <span className="issue-list"><AlertTriangle />{row.issues.join(' ')}</span> : <span className="valid-row"><CheckCircle2 /> Valid</span>}</td></tr>)}</tbody></table></div>}<div className="form-grid"><Field label="Source name"><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} /></Field><Field label="Required attribution"><input value={attribution} onChange={(event) => setAttribution(event.target.value)} /></Field><Field label="Permission status"><select value={permissionStatus} onChange={(event) => setPermissionStatus(event.target.value as DataSource['permissionStatus'])}><option value="not-reviewed">Not reviewed</option><option value="permitted">Permitted</option><option value="restricted">Restricted</option><option value="prohibited">Prohibited</option></select></Field></div><p className="muted">File integrity: {fileHash || 'Calculating…'}</p><label className="check-row"><input type="checkbox" checked={permissionAcknowledged} onChange={(event) => setPermissionAcknowledged(event.target.checked)} /><span><strong>I reviewed the source terms</strong><small>Importing or processing this file does not grant permission to redistribute it.</small></span></label></div></div></>}
    <div className="form-actions"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid.length || Boolean(parsed?.parseErrors.length) || !permissionAcknowledged || !fileHash} onClick={() => void commit()}>Commit {valid.length || ''} valid row{valid.length === 1 ? '' : 's'}</Button></div>
  </div></Modal>;
}
