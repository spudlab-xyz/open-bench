import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { Button, Field, Modal, SortableHeader, useSortableRows } from './ui';
import { exampleCsv, parseCsv, previewCsv, type CsvMapping } from '../domain/csv';
import type { Experiment } from '../types';
import { downloadText } from '../utils/files';

export function CsvImportModal({ experiment, onClose, onCommit }: { experiment: Experiment; onClose: () => void; onCommit: (measurements: NonNullable<ReturnType<typeof previewCsv>[number]['measurement']>[]) => Promise<boolean> }) {
  const [filename, setFilename] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({ specimen: '', run: '', point: '', value: '', unit: '', notes: '' });
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
    const result = parseCsv(await file.text());
    setFilename(file.name);
    setParsed(result);
    const find = (...names: string[]) => result.fields.find((field) => names.includes(field.toLowerCase())) ?? '';
    setMapping({ specimen: find('specimen', 'specimen_id', 'plant'), run: find('run', 'run_id'), point: find('elapsed', 'elapsed_minutes', 'observation_date', 'date'), value: find('value', variable?.name.toLowerCase().replaceAll(' ', '_') ?? ''), unit: find('unit'), notes: find('notes') });
  };
  const commit = async () => { if (valid.length && await onCommit(valid)) onClose(); };
  return <Modal title="Import measurements from CSV" onClose={onClose} wide><div className="import-flow">
    <div className="import-step"><span>1</span><div><h3>Choose a CSV file</h3><p>Quoted fields are supported. Files stay in this browser.</p><div className="button-row"><label className="button button-secondary file-button"><Upload size={16} /> {filename || 'Choose file'}<input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label><Button onClick={() => downloadText(`${experiment.kind}-example.csv`, exampleCsv(experiment), 'text/csv')}><Download size={16} /> Download example</Button></div></div></div>
    {parsed && <><div className="import-step"><span>2</span><div className="grow"><h3>Map columns and assign units</h3>{parsed.parseErrors.length > 0 && <div className="validation-box danger"><AlertTriangle />{parsed.parseErrors.join(' ')}</div>}<div className="mapping-grid">{([['specimen', 'Specimen identity'], ['run', 'Run identity'], ['point', experiment.kind === 'plant' ? 'Observation date' : 'Elapsed time'], ['value', variable?.name ?? 'Value'], ['unit', `Unit (must be ${variable?.unit})`], ['notes', 'Notes (optional)']] as const).map(([key, label]) => <Field key={key} label={label}><select value={mapping[key] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}><option value="">Not mapped</option>{parsed.fields.map((field) => <option key={field} value={field}>{field}</option>)}</select></Field>)}</div></div></div>
      <div className="import-step"><span>3</span><div className="grow"><h3>Review before committing</h3><p>{valid.length} valid row{valid.length === 1 ? '' : 's'} ready. {invalidCount} invalid row{invalidCount === 1 ? '' : 's'} will remain visible and will not be silently dropped.</p>{preview.length > 0 && <div className="table-scroll preview-table"><table><thead><tr>{previewHeader('row', 'Row', true)}{previewHeader('specimen', 'Specimen')}{previewHeader('run', 'Run')}{previewHeader('point', 'Point')}{previewHeader('value', 'Value', true)}{previewHeader('validation', 'Validation')}</tr></thead><tbody>{previewSort.rows.slice(0, 30).map((row) => <tr key={row.rowNumber} className={row.issues.length ? 'row-invalid' : ''}><td>{row.rowNumber}</td><td>{row.raw[mapping.specimen]}</td><td>{row.raw[mapping.run]}</td><td>{row.raw[mapping.point]}</td><td>{row.raw[mapping.value]} {row.raw[mapping.unit]}</td><td>{row.issues.length ? <span className="issue-list"><AlertTriangle />{row.issues.join(' ')}</span> : <span className="valid-row"><CheckCircle2 /> Valid</span>}</td></tr>)}</tbody></table></div>}</div></div></>}
    <div className="form-actions"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid.length || Boolean(parsed?.parseErrors.length)} onClick={() => void commit()}>Commit {valid.length || ''} valid row{valid.length === 1 ? '' : 's'}</Button></div>
  </div></Modal>;
}
