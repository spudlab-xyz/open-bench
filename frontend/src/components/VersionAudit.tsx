import { Eye, History } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { versionRecordsForEntity } from '../domain/versioning';
import type { VersionRecord } from '../types';
import { formatDateTime } from '../utils/files';
import { Button, Modal, StatusBadge } from './ui';

export function VersionTimeline({ records }: { records: VersionRecord[] }) {
  return <div className="version-timeline">{[...records].reverse().map((record) => <article key={record.id}>
    <span className="version-marker"><History size={15} /></span>
    <div><header><strong>Version {record.version}</strong><StatusBadge tone={record.operation === 'deleted' ? 'danger' : record.operation === 'created' ? 'success' : 'info'}>{record.operation}</StatusBadge><small>{record.source}</small></header><p>{record.reason}</p><small>{formatDateTime(record.timestamp)}</small><details><summary>Inspect snapshot</summary><pre>{JSON.stringify(record.snapshot, null, 2)}</pre></details></div>
  </article>)}</div>;
}

export function VersionAuditButton({ entityType, entityId, label, compact = false }: { entityType: string; entityId: string; label?: string; compact?: boolean }) {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  if (!workspace) return null;
  const records = versionRecordsForEntity(workspace, entityType, entityId);
  const latest = records.at(-1);
  if (!latest) return null;
  const changes = Math.max(0, records.length - 1);
  const entityLabel = label ?? latest.entityLabel;
  const historyUrl = `/history?entity=${encodeURIComponent(`${entityType}:${entityId}`)}${changes ? '' : '&includeInitial=1'}`;
  return <>
    <button type="button" className={`version-audit-button${compact ? ' compact' : ''}${changes ? ' has-changes' : ''}`} aria-label={`Open version history for ${entityLabel}`} title={changes ? `Version ${latest.version}; ${changes} recorded change${changes === 1 ? '' : 's'}` : 'Version 1; no changes yet'} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}>
      <History size={compact ? 14 : 16} /><strong>v{latest.version}</strong><span>{changes ? `${changes} change${changes === 1 ? '' : 's'}` : 'Initial'}</span>
    </button>
    {open && createPortal(<Modal title={`${entityLabel} — audit history`} onClose={() => setOpen(false)} wide><div className="version-audit-dialog">
      <div className="version-audit-summary"><div><small>Current version</small><strong>v{latest.version}</strong></div><div><small>Recorded changes</small><strong>{changes}</strong></div><div><small>Latest audit event</small><strong>{formatDateTime(latest.timestamp)}</strong></div></div>
      {changes ? <p className="version-audit-intro">This record has changed since its initial version. Every retained revision is listed below.</p> : <p className="version-audit-intro">This record is still at its initial version and has no later changes.</p>}
      <VersionTimeline records={records} />
      <div className="form-actions"><Button onClick={() => setOpen(false)}>Close</Button><Link className="button button-primary" to={historyUrl} onClick={() => setOpen(false)}><Eye size={16} /> Open full history and compare</Link></div>
    </div></Modal>, document.body)}
  </>;
}
