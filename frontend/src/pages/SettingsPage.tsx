import { AlertTriangle, Database, Download, RotateCcw, Upload } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Panel } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { createExperimentExport, importIntoWorkspace, validateExperimentExchange } from '../domain/exchange';
import { attachmentRecordFromArchive, createWorkspaceArchive, validateWorkspaceArchive, workspaceIntegrityIssues } from '../domain/archive';
import { downloadText } from '../utils/files';

export function SettingsPage() {
  const { workspace, commit, resetDemo, loadAttachment, saveAttachment } = useWorkspace();
  const navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [importName, setImportName] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');
  if (!workspace) return null;
  const exportExperiment = (id: string) => {
    const experiment = workspace.experiments.find((item) => item.id === id);
    if (experiment) downloadText(`${experiment.code}-openbench.json`, JSON.stringify(createExperimentExport(experiment), null, 2), 'application/json');
  };
  const chooseImport = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      validateExperimentExchange(parsed);
      const next = importIntoWorkspace(workspace, parsed);
      if (await commit(() => next)) { setImportName(parsed.experiment.title); setImportError(''); }
    } catch (error) { setImportError(error instanceof Error ? error.message : 'The JSON import is invalid.'); }
  };
  const reset = async () => { if (await resetDemo()) { setResetOpen(false); navigate('/'); } };
  const exportArchive = async () => {
    const archive = await createWorkspaceArchive(workspace, loadAttachment);
    downloadText(`openbench-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(archive, null, 2), 'application/json');
    setArchiveStatus(archive.manifest.omissions.length ? `Archive created with ${archive.manifest.omissions.length} documented omission(s).` : 'Complete browser archive created with no known omissions.');
  };
  const restoreArchive = async (file?: File) => {
    if (!file) return;
    try {
      const archive = await validateWorkspaceArchive(JSON.parse(await file.text()));
      if (!confirm(`Restore archive with ${archive.workspace.experiments.length} experiments? Current active records will be versioned as changed or deleted.`)) return;
      for (const attachment of archive.attachments) await saveAttachment(attachmentRecordFromArchive(attachment));
      if (await commit(() => archive.workspace, { reason: `Restored validated browser archive created ${archive.createdAt}.` })) setArchiveStatus(`Restored archive created ${archive.createdAt}; ${archive.attachments.length} attachment(s) verified.`);
    } catch (error) { setArchiveStatus(error instanceof Error ? error.message : 'Archive restore failed.'); }
  };
  return <div className="page"><header className="page-header"><div><p className="eyebrow">Workspace preferences</p><h1>Settings</h1><p>Manage browser-local prototype data and portable experiment copies.</p></div></header>
    <div className="settings-grid"><Panel title={<h2><Database size={19} /> Browser storage</h2>}><div className="settings-copy"><p><strong>Your experiment data is stored in this browser using IndexedDB.</strong></p><p>OpenBench does not send experiment records, notes or attachments to an external service. Clearing site data in your browser can remove this workspace.</p><dl className="detail-list"><div><dt>Seed version</dt><dd>{workspace.seedVersion}</dd></div><div><dt>Format version</dt><dd>{workspace.schemaVersion}</dd></div><div><dt>Experiments</dt><dd>{workspace.experiments.length}</dd></div><div><dt>Integrity issues</dt><dd>{workspaceIntegrityIssues(workspace).length}</dd></div></dl></div></Panel>
      <Panel title={<h2><Database size={19} /> Complete browser archive</h2>}><p>Export the full schema-v4 workspace, append-only history, raw import provenance, method-validation assessments, scientific review records, and locally available attachment bytes with SHA-256 integrity hashes.</p><div className="button-row"><Button variant="primary" onClick={() => void exportArchive()}><Download size={16} /> Export complete archive</Button><label className="button button-secondary file-button"><Upload size={16} /> Validate and restore archive<input type="file" accept="application/json,.json" onChange={(event) => void restoreArchive(event.target.files?.[0])} /></label></div>{archiveStatus && <div className="validation-box warning">{archiveStatus}</div>}</Panel>
      <Panel title={<h2><Download size={19} /> JSON sharing</h2>}><p>Export the current experiment snapshot for another browser. Structure, methods, specimens, runs, corrections, analyses and conclusions are included. The workspace-wide version timeline is not included.</p><div className="notice"><AlertTriangle /><span>Attachment metadata is exported. Attachment bytes are not included, so plain JSON is not a complete attachment backup.</span></div><div className="export-list">{workspace.experiments.map((experiment) => <div key={experiment.id}><span><strong>{experiment.title}</strong><small>{experiment.code} · data revision {experiment.dataRevision}</small></span><Button onClick={() => exportExperiment(experiment.id)}><Download size={15} /> Export</Button></div>)}</div></Panel>
      <Panel title={<h2><Upload size={19} /> Import experiment JSON</h2>}><p>Imports are validated before saving. Identifiers are remapped and a separate local copy is created; existing experiments are never merged or overwritten.</p><label className="button button-secondary file-button"><Upload size={16} /> Choose OpenBench JSON<input type="file" accept="application/json,.json" onChange={(event) => void chooseImport(event.target.files?.[0])} /></label>{importError && <div className="validation-box danger"><AlertTriangle />{importError}</div>}{importName && <div className="validation-box success">Imported “{importName}” as a separate copy.</div>}</Panel>
      <Panel title={<h2><RotateCcw size={19} /> Reset demo workspace</h2>}><p>Restore the seeded active workspace and remove local attachment bytes. Version records are retained as tombstones and reset events.</p><Button variant="danger" onClick={() => setResetOpen(true)}>Reset demo workspace</Button></Panel>
    </div>
    {resetOpen && <Modal title="Reset demo workspace?" onClose={() => setResetOpen(false)}><div className="form-stack"><div className="validation-box danger"><AlertTriangle /><span>This replaces active local records and permanently removes attachment bytes. Record snapshots remain visible in Version history.</span></div><div><h3>Export before resetting</h3><p className="muted">Download any current experiment snapshot you want to explore again later. Attachment bytes and workspace version history are not included.</p><div className="reset-exports">{workspace.experiments.map((experiment) => <Button key={experiment.id} onClick={() => exportExperiment(experiment.id)}><Download size={15} /> {experiment.code}</Button>)}</div></div><div className="form-actions"><Button onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => void reset()}>Reset active workspace</Button></div></div></Modal>}
  </div>;
}
