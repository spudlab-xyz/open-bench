import { FileImage, Paperclip, Plus, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ExperimentChart } from '../../components/ExperimentChart';
import { Button, Field, Modal, Panel, SortableHeader, useSortableRows } from '../../components/ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import { summariseByCondition, type ConditionSummary } from '../../domain/calculations';
import type { AttachmentMeta } from '../../types';
import { formatDate, formatDateTime, uid } from '../../utils/files';
import type { ExperimentTabProps } from './ExperimentPage';

const ATTACHMENT_LIMIT = 5 * 1024 * 1024;

export function ReportTab({ experiment }: ExperimentTabProps) {
  const { updateExperiment, saveAttachment, loadAttachment, deleteAttachment } = useWorkspace();
  const variable = experiment.variables.find((item) => item.role === 'outcome');
  const savedAnalysis = experiment.analyses.at(-1);
  const [editing, setEditing] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const settings = savedAnalysis?.settings ?? (variable ? { variableId: variable.id, comparison: 'observed' as const, selectedPoint: [...new Set(experiment.measurements.map((item) => item.elapsed ?? item.observedAt).filter((item): item is number | string => item !== undefined))].at(-1) ?? 0, baselinePoint: undefined, conditionIds: experiment.conditions.map((item) => item.id), specimenIds: [], runIds: [], showTrajectories: true, chartType: 'line' as const } : undefined);
  const summaries = settings ? summariseByCondition(experiment, settings, savedAnalysis?.exclusions.map((item) => item.measurementId)) : [];
  type SummarySortKey = 'condition' | 'count' | 'mean' | 'median' | 'minimum' | 'maximum' | 'sd';
  const summarySort = useSortableRows<ConditionSummary, SummarySortKey>(summaries, 'condition', (summary, key) => {
    if (key === 'condition') return summary.conditionName;
    if (key === 'count') return summary.stats.count;
    if (key === 'mean') return summary.stats.mean;
    if (key === 'median') return summary.stats.median;
    if (key === 'minimum') return summary.stats.minimum;
    if (key === 'maximum') return summary.stats.maximum;
    return summary.stats.sampleStandardDeviation;
  });
  const summaryHeader = (key: SummarySortKey, label: string, numeric = false) => <SortableHeader active={summarySort.sort.key === key} direction={summarySort.sort.direction} onSort={() => summarySort.sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  const saveConclusions = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    if (await updateExperiment(experiment.id, (current) => ({ ...current, conclusion: String(data.get('conclusion')), limitations: String(data.get('limitations')), followUp: String(data.get('followUp')), updatedAt: new Date().toISOString() }))) setEditing(false);
  };
  const addNote = async (form: HTMLFormElement) => {
    const data = new FormData(form); const text = String(data.get('note')).trim(); if (!text) return;
    if (await updateExperiment(experiment.id, (current) => ({ ...current, notes: [...current.notes, { id: uid('note'), text, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }))) form.reset();
  };
  const addAttachment = async (form: HTMLFormElement) => {
    const data = new FormData(form); const file = data.get('file'); if (!(file instanceof File) || !file.size) return;
    if (file.size > ATTACHMENT_LIMIT) { alert('Photographs are limited to 5 MB in this prototype. Choose a smaller file.'); return; }
    if (!file.type.startsWith('image/')) { alert('This prototype accepts image attachments only.'); return; }
    const id = uid('attachment');
    try {
      await saveAttachment({ id, experimentId: experiment.id, blob: file });
      const meta: AttachmentMeta = { id, name: file.name, type: file.type, size: file.size, caption: String(data.get('caption')), createdAt: new Date().toISOString() };
      if (await updateExperiment(experiment.id, (current) => ({ ...current, attachments: [...current.attachments, meta], updatedAt: new Date().toISOString() }))) setAttachmentOpen(false);
    } catch (error) { alert(error instanceof Error ? error.message : 'The attachment could not be stored.'); }
  };
  const viewAttachment = async (id: string) => {
    try { const record = await loadAttachment(id); if (!record) throw new Error('Attachment bytes are not available in this browser.'); const url = URL.createObjectURL(record.blob); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); } catch (error) { alert(error instanceof Error ? error.message : 'Attachment could not be opened.'); }
  };
  const removeAttachment = async (id: string) => {
    if (!confirm('Remove this local attachment? This cannot be undone.')) return;
    try { await deleteAttachment(id); await updateExperiment(experiment.id, (current) => ({ ...current, attachments: current.attachments.filter((item) => item.id !== id), updatedAt: new Date().toISOString() })); } catch (error) { alert(error instanceof Error ? error.message : 'Attachment could not be removed.'); }
  };
  return <><div className="report-actions no-print"><div><h2>Experiment report</h2><p>Print this browser presentation or save it as PDF using your browser.</p></div><Button variant="primary" onClick={() => window.print()}><Printer size={17} /> Print / save as PDF</Button></div>
    <article className="report-document"><header className="report-cover"><div><span className="report-brand">OpenBench <small>by SpudLab</small></span><p>{experiment.code} · {formatDate(experiment.updatedAt)}</p></div><h1>{experiment.title}</h1><p>{experiment.description}</p></header>
      <section className="report-section"><span className="section-number">01</span><div><h2>Question and hypothesis</h2><p className="report-lead">{experiment.question || 'No research question recorded.'}</p><p><strong>{experiment.exploratory ? 'Exploratory study.' : 'Hypothesis:'}</strong> {experiment.exploratory ? 'No directional hypothesis was specified.' : experiment.hypothesis}</p></div></section>
      <section className="report-section"><span className="section-number">02</span><div><h2>Design and conditions</h2><p><strong>Varied factor:</strong> {experiment.variedFactor || 'Not recorded'} &nbsp; <strong>Measured outcome:</strong> {experiment.measuredOutcome || 'Not recorded'}</p><p><strong>Controlled/contextual factors:</strong> {experiment.controls || 'Not recorded'}</p><div className="condition-cards">{experiment.conditions.map((condition) => <div key={condition.id}><i style={{ background: condition.colour }} /><strong>{condition.name}</strong><span>{condition.description}</span><small>{experiment.specimens.filter((item) => item.conditionId === condition.id).length} physical specimens</small></div>)}</div></div></section>
      <section className="report-section"><span className="section-number">03</span><div><h2>Method and executions</h2>{experiment.methodRevisions.map((method) => <div className="report-method" key={method.id}><h3>{method.title} — revision {method.version}</h3><ol>{method.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><p><strong>Equipment:</strong> {method.equipment}</p></div>)}<h3>Recorded deviations</h3>{experiment.runs.some((item) => item.deviations) ? <ul>{experiment.runs.filter((item) => item.deviations).map((run) => <li key={run.id}><strong>{run.name}:</strong> {run.deviations}</li>)}</ul> : <p>No execution-specific deviations recorded.</p>}<p className="provenance-line">{experiment.specimens.length} physical specimens · {experiment.runs.length} procedure executions · {experiment.measurements.length} repeated observations</p></div></section>
      {variable && settings && <section className="report-section report-results"><span className="section-number">04</span><div><h2>Calculated results</h2><p>Observed records at exact selected points; missing readings remain missing.</p><ExperimentChart experiment={experiment} variableId={variable.id} settings={settings} excludedIds={savedAnalysis?.exclusions.map((item) => item.measurementId)} /><div className="table-scroll"><table><thead><tr>{summaryHeader('condition', 'Condition')}{summaryHeader('count', 'Physical specimens (n)', true)}{summaryHeader('mean', 'Mean', true)}{summaryHeader('median', 'Median', true)}{summaryHeader('minimum', 'Minimum', true)}{summaryHeader('maximum', 'Maximum', true)}{summaryHeader('sd', 'Sample SD', true)}</tr></thead><tbody>{summarySort.rows.map((summary) => <tr key={summary.conditionId}><td>{summary.conditionName}</td><td>{summary.stats.count}</td><td>{summary.stats.mean?.toFixed(2) ?? '—'}</td><td>{summary.stats.median?.toFixed(2) ?? '—'}</td><td>{summary.stats.minimum?.toFixed(2) ?? '—'}</td><td>{summary.stats.maximum?.toFixed(2) ?? '—'}</td><td>{summary.stats.sampleStandardDeviation?.toFixed(2) ?? 'Unavailable'}</td></tr>)}</tbody></table></div>{savedAnalysis?.exclusions.length ? <div className="report-exclusions"><h3>Documented analysis exclusions</h3>{savedAnalysis.exclusions.map((exclusion) => <p key={exclusion.measurementId}><strong>{exclusion.measurementId}:</strong> {exclusion.reason}</p>)}</div> : <p>No analysis-specific exclusions recorded.</p>}</div></section>}
      <section className="report-section"><span className="section-number">05</span><div><div className="section-heading"><h2>Researcher conclusion</h2><Button className="no-print" onClick={() => setEditing(true)}>Edit conclusions</Button></div><div className="conclusion-grid"><div><h3>Conclusion</h3><p>{experiment.conclusion || 'No conclusion recorded.'}</p></div><div><h3>Limitations</h3><p>{experiment.limitations || 'No limitations recorded.'}</p></div><div><h3>Follow-up questions</h3><p>{experiment.followUp || 'No follow-up questions recorded.'}</p></div></div><p className="separation-note">Researcher-authored conclusions are presented separately from calculated summaries.</p></div></section>
      <section className="report-section"><span className="section-number">06</span><div><h2>Notes, attachments and provenance</h2><div className="notes-list">{experiment.notes.map((note) => <blockquote key={note.id}>{note.text}<small>{formatDateTime(note.createdAt)}</small></blockquote>)}</div><form className="note-form no-print" onSubmit={(event) => { event.preventDefault(); void addNote(event.currentTarget); }}><Field label="Add research note"><textarea name="note" rows={2} /></Field><Button type="submit"><Plus size={16} /> Add note</Button></form><div className="attachment-header"><h3>Local photographs</h3><Button className="no-print" onClick={() => setAttachmentOpen(true)}><Paperclip size={16} /> Add photograph</Button></div>{experiment.attachments.length ? <div className="attachment-list">{experiment.attachments.map((attachment) => <div key={attachment.id}><FileImage /><span><strong>{attachment.caption || attachment.name}</strong><small>{attachment.name} · {(attachment.size / 1024).toFixed(0)} KB</small></span><div className="no-print"><Button variant="ghost" onClick={() => void viewAttachment(attachment.id)}>View</Button><button className="icon-button danger-text" aria-label="Remove attachment" onClick={() => void removeAttachment(attachment.id)}><Trash2 size={16} /></button></div></div>)}</div> : <p className="muted">No photographs attached. Prototype limit: image files up to 5 MB each.</p>}<div className="provenance-box"><strong>Analysis provenance</strong><span>Experiment data revision {experiment.dataRevision}</span><span>{savedAnalysis ? `${savedAnalysis.name}, analysis revision ${savedAnalysis.revision}, source data revision ${savedAnalysis.sourceDataRevision}` : 'No named analysis selected; report uses current data.'}</span><span>Latest method revision {experiment.methodRevisions.at(-1)?.version ?? '—'}</span><span>{experiment.importProvenance || 'Created in this browser workspace.'}</span></div></div></section>
    </article>
    {editing && <Modal title="Edit researcher conclusions" onClose={() => setEditing(false)} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void saveConclusions(event.currentTarget); }}><Field label="Conclusion"><textarea name="conclusion" rows={4} defaultValue={experiment.conclusion} /></Field><Field label="Limitations"><textarea name="limitations" rows={4} defaultValue={experiment.limitations} /></Field><Field label="Follow-up questions"><textarea name="followUp" rows={4} defaultValue={experiment.followUp} /></Field><div className="form-actions"><Button type="button" onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" type="submit">Save conclusions</Button></div></form></Modal>}
    {attachmentOpen && <Modal title="Add local photograph" onClose={() => setAttachmentOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void addAttachment(event.currentTarget); }}><Field label="Photograph" hint="Image files only, maximum 5 MB. Actual bytes are stored in IndexedDB."><input name="file" type="file" accept="image/*" required /></Field><Field label="Caption"><input name="caption" required /></Field><p className="muted">Plain JSON exports include attachment metadata but not attachment bytes.</p><div className="form-actions"><Button type="button" onClick={() => setAttachmentOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Store photograph</Button></div></form></Modal>}
  </>;
}
