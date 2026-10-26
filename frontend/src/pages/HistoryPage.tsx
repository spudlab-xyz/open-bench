import { GitCompareArrows, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VersionTimeline } from '../components/VersionAudit';
import { Field, Panel, StatusBadge } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { isInitialVersionRecord } from '../domain/versioning';
import type { VersionRecord } from '../types';

function flatten(value: unknown, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  const visit = (item: unknown, path: string) => {
    if (item !== null && typeof item === 'object') {
      const entries = Object.entries(item as Record<string, unknown>);
      if (!entries.length) result.set(path || '(root)', Array.isArray(item) ? '[]' : '{}');
      entries.forEach(([key, child]) => visit(child, path ? `${path}.${key}` : key));
    } else result.set(path || '(root)', item === undefined ? 'undefined' : JSON.stringify(item));
  };
  visit(value, prefix);
  return result;
}

function compareSnapshots(from: VersionRecord, to: VersionRecord) {
  const before = flatten(from.snapshot);
  const after = flatten(to.snapshot);
  return [...new Set([...before.keys(), ...after.keys()])].sort().flatMap((field) => before.get(field) === after.get(field) ? [] : [{ field, before: before.get(field) ?? 'Not present', after: after.get(field) ?? 'Not present' }]);
}

export function HistoryPage() {
  const { workspace } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [includeInitial, setIncludeInitial] = useState(searchParams.get('includeInitial') === '1');
  const groups = useMemo(() => {
    if (!workspace) return [];
    const byEntity = new Map<string, VersionRecord[]>();
    workspace.versionHistory.forEach((record) => {
      const key = `${record.entityType}:${record.entityId}`;
      byEntity.set(key, [...(byEntity.get(key) ?? []), record]);
    });
    return [...byEntity.entries()].map(([key, records]) => ({ key, records: records.sort((left, right) => left.version - right.version), latest: records.at(-1)! }))
      .sort((left, right) => right.latest.timestamp.localeCompare(left.latest.timestamp));
  }, [workspace]);
  const visibleGroups = includeInitial ? groups : groups.filter((group) => group.records.some((record) => !isInitialVersionRecord(record)));
  const filtered = visibleGroups.filter(({ latest }) => `${latest.entityType} ${latest.entityLabel} ${latest.entityId}`.toLowerCase().includes(query.toLowerCase()));
  const [selectedKey, setSelectedKey] = useState(searchParams.get('entity') ?? '');
  const selectedGroup = visibleGroups.find((group) => group.key === selectedKey) ?? filtered[0] ?? visibleGroups[0];
  const [fromVersion, setFromVersion] = useState(1);
  const [toVersion, setToVersion] = useState(1);
  useEffect(() => {
    if (!selectedGroup) return;
    setFromVersion(selectedGroup.records[0].version);
    setToVersion(selectedGroup.records.at(-1)!.version);
  }, [selectedGroup?.key]);
  if (!workspace) return null;
  const timelineRecords = selectedGroup ? includeInitial ? selectedGroup.records : selectedGroup.records.filter((record) => !isInitialVersionRecord(record)) : [];
  const from = selectedGroup ? selectedGroup.records.find((record) => record.version === fromVersion) ?? selectedGroup.records[0] : undefined;
  const to = selectedGroup ? selectedGroup.records.find((record) => record.version === toVersion) ?? selectedGroup.records.at(-1)! : undefined;
  const differences = from && to ? compareSnapshots(from, to) : [];
  const visibleEventCount = includeInitial ? workspace.versionHistory.length : workspace.versionHistory.filter((record) => !isInitialVersionRecord(record)).length;
  return <div className="page history-page"><header className="page-header"><div><p className="eyebrow">Audit trail</p><h1>Version history</h1><p>Review records that changed after creation, including deleted records, and compare any two retained snapshots.</p></div></header>
    <Panel className="history-search"><Field label="Find a changed item"><div className="search-input"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search type, name, or identifier" /></div></Field><div className="history-search-meta"><label className="check-row simple"><input type="checkbox" checked={includeInitial} onChange={(event) => setIncludeInitial(event.target.checked)} /><span><strong>Include initial versions</strong><small>Show unchanged records and version 1 creation events.</small></span></label><span>{visibleGroups.length} {includeInitial ? 'versioned' : 'changed'} items · {visibleEventCount} {includeInitial ? 'retained versions' : 'changes'}</span></div></Panel>
    {selectedGroup && from && to ? <div className="history-layout"><Panel title={<h2>{includeInitial ? 'Items' : 'Changed items'}</h2>} className="history-entities"><div className="history-entity-list">{filtered.map((group) => <button key={group.key} className={group.key === selectedGroup.key ? 'active' : ''} onClick={() => setSelectedKey(group.key)}><span><strong>{group.latest.entityLabel}</strong><small>{group.latest.entityType} · {group.latest.entityId}</small></span><span><b>v{group.latest.version}</b>{group.latest.operation === 'deleted' && <StatusBadge tone="danger">Deleted</StatusBadge>}</span></button>)}</div>{!filtered.length && <div className="no-results">No history matches this search.</div>}</Panel>
      <div className="history-detail"><Panel title={<div><h2>{selectedGroup.latest.entityLabel}</h2><p className="panel-subtitle">{selectedGroup.latest.entityType} · {selectedGroup.latest.entityId} · latest version {selectedGroup.latest.version}</p></div>}>{!includeInitial && <p className="history-initial-note">Initial creation is hidden from this timeline. Version 1 remains available below as a comparison baseline.</p>}<VersionTimeline records={timelineRecords} /></Panel>
        <Panel title={<h2><GitCompareArrows /> Compare versions</h2>}><div className="history-compare-selectors"><Field label="Earlier version"><select value={from.version} onChange={(event) => setFromVersion(Number(event.target.value))}>{selectedGroup.records.map((record) => <option key={record.id} value={record.version}>Version {record.version} — {record.operation}</option>)}</select></Field><Field label="Later version"><select value={to.version} onChange={(event) => setToVersion(Number(event.target.value))}>{selectedGroup.records.map((record) => <option key={record.id} value={record.version}>Version {record.version} — {record.operation}</option>)}</select></Field></div>{differences.length ? <div className="history-differences">{differences.map((difference) => <div key={difference.field}><strong>{difference.field}</strong><span><small>Version {from.version}</small><code>{difference.before}</code></span><span><small>Version {to.version}</small><code>{difference.after}</code></span></div>)}</div> : <p className="muted">These snapshots have no field differences.</p>}</Panel>
      </div></div> : <Panel><div className="empty-state"><h3>No changes recorded yet</h3><p>Only initial versions exist. Select <strong>Include initial versions</strong> above to inspect those creation snapshots.</p></div></Panel>}
  </div>;
}
