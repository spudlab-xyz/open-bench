import { FileClock, GitCompareArrows, History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildMeasurementAuditStates, compareMeasurementSnapshots } from '../domain/measurements';
import type { Measurement, VariableDefinition } from '../types';
import { formatDateTime } from '../utils/files';
import { Field, Modal, StatusBadge } from './ui';

export function MeasurementAuditModal({ measurement, variables, onClose }: { measurement: Measurement; variables: VariableDefinition[]; onClose: () => void }) {
  const states = useMemo(() => buildMeasurementAuditStates(measurement), [measurement]);
  const [fromId, setFromId] = useState(states.at(-2)?.id ?? states[0].id);
  const [toId, setToId] = useState(states.at(-1)?.id ?? states[0].id);
  const from = states.find((state) => state.id === fromId) ?? states[0];
  const to = states.find((state) => state.id === toId) ?? states.at(-1)!;
  const comparison = compareMeasurementSnapshots(from.snapshot, to.snapshot);
  const variable = (id: string) => variables.find((item) => item.id === id);
  const displayValue = (value: number | null | undefined, unit = '') => value === null || value === undefined ? 'Missing' : `${value}${unit ? ` ${unit}` : ''}`;
  return <Modal title="Measurement audit trail" onClose={onClose} wide><div className="measurement-audit">
    <div className="measurement-audit-intro"><History /><div><strong>{states.length - 1} tracked change{states.length - 1 === 1 ? '' : 's'}</strong><p>Compare effective measurement states. Original numerical values also remain in correction records.</p></div></div>
    <div className="measurement-audit-timeline">{states.map((state, index) => <div key={state.id} className={`measurement-audit-event audit-source-${state.source}`}><span className="audit-sequence">{index}</span><span><strong>{state.label}</strong><small>{state.timestamp ? formatDateTime(state.timestamp) : index === 0 ? 'Baseline reconstructed from the earliest tracked state' : 'Timestamp unavailable'}</small>{state.reason && <p>{state.reason}</p>}</span><StatusBadge tone={state.source === 'revision' ? 'info' : state.source === 'legacy-correction' ? 'warning' : 'neutral'}>{state.source === 'legacy-correction' ? 'Legacy correction' : state.source}</StatusBadge></div>)}</div>

    <section className="measurement-comparison"><div className="comparison-selectors"><Field label="Earlier state"><select value={fromId} onChange={(event) => setFromId(event.target.value)}>{states.map((state) => <option key={state.id} value={state.id}>{state.label}</option>)}</select></Field><GitCompareArrows /><Field label="Later state"><select value={toId} onChange={(event) => setToId(event.target.value)}>{states.map((state) => <option key={state.id} value={state.id}>{state.label}</option>)}</select></Field></div><div className="measurement-comparison-summary"><span><small>Comparing</small><strong>{from.label} → {to.label}</strong></span><span><small>Changed fields</small><strong>{comparison.changedFields}</strong></span>{to.reason && <span><small>Revision note</small><strong>{to.reason}</strong></span>}</div>
      <div className="measurement-comparison-fields">{comparison.values.map((item) => <AuditField key={item.variableId} label={`${variable(item.variableId)?.name ?? item.variableId}${variable(item.variableId)?.unit ? ` (${variable(item.variableId)?.unit})` : ''}`} before={displayValue(item.before, variable(item.variableId)?.unit)} after={displayValue(item.after, variable(item.variableId)?.unit)} changed={item.changed} />)}<AuditField label="Quality status" before={comparison.quality.before === 'review' ? 'Needs review' : 'Valid'} after={comparison.quality.after === 'review' ? 'Needs review' : 'Valid'} changed={comparison.quality.changed} /><AuditField label="Notes" before={comparison.notes.before || 'No notes'} after={comparison.notes.after || 'No notes'} changed={comparison.notes.changed} /></div>
    </section>

    {measurement.corrections.length > 0 && <section className="preserved-corrections"><h3><FileClock /> Preserved numerical corrections</h3><p>These records are append-only and preserve each previous numerical value.</p><div className="history-list">{measurement.corrections.map((correction) => <div key={correction.id}><FileClock /><span><strong>{correction.previousValue} → {correction.replacementValue} {variable(correction.variableId)?.unit}</strong><small>{variable(correction.variableId)?.name ?? correction.variableId} · {correction.reason}</small><small>{formatDateTime(correction.timestamp)}</small></span></div>)}</div></section>}
  </div></Modal>;
}

function AuditField({ label, before, after, changed }: { label: string; before: string; after: string; changed: boolean }) {
  return <section className={changed ? 'comparison-field changed' : 'comparison-field'}><header><h3>{label}</h3><StatusBadge tone={changed ? 'warning' : 'neutral'}>{changed ? 'Changed' : 'Unchanged'}</StatusBadge></header><div><span><small>Before</small><p>{before}</p></span><span><small>After</small><p>{after}</p></span></div></section>;
}
