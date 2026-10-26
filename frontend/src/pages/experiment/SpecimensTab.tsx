import { Layers3, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, EmptyState, Field, Modal, Panel, SortableHeader, useSortableRows } from '../../components/ui';
import { VersionAuditButton } from '../../components/VersionAudit';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Condition, Specimen } from '../../types';
import { uid } from '../../utils/files';
import type { ExperimentTabProps } from './ExperimentPage';

export function SpecimensTab({ experiment }: ExperimentTabProps) {
  const { updateExperiment } = useWorkspace();
  const [specimenModal, setSpecimenModal] = useState<Specimen | 'new' | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [factorDraft, setFactorDraft] = useState(experiment.variedFactor);
  const [conditionDrafts, setConditionDrafts] = useState<Condition[]>([]);
  const [conditionError, setConditionError] = useState('');
  type SortKey = 'identity' | 'condition' | 'unit' | 'runs' | 'notes';
  const specimenSort = useSortableRows<Specimen, SortKey>(experiment.specimens, 'identity', (specimen, key) => {
    if (key === 'identity') return specimen.name;
    if (key === 'condition') return experiment.conditions.find((item) => item.id === specimen.conditionId)?.name;
    if (key === 'unit') return specimen.experimentalUnit;
    if (key === 'runs') return experiment.runs.filter((run) => run.specimenIds.includes(specimen.id)).length;
    return specimen.notes;
  });
  const header = (key: SortKey, label: string, numeric = false) => <SortableHeader active={specimenSort.sort.key === key} direction={specimenSort.sort.direction} onSort={() => specimenSort.sortBy(key)} className={numeric ? 'numeric' : ''}>{label}</SortableHeader>;
  const openDesign = () => {
    setFactorDraft(experiment.variedFactor);
    setConditionDrafts(structuredClone(experiment.conditions));
    setConditionError('');
    setDesignOpen(true);
  };
  const saveSpecimen = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const specimen: Specimen = {
      id: specimenModal === 'new' ? uid('specimen') : specimenModal!.id,
      name: String(data.get('name')),
      conditionId: String(data.get('condition')),
      experimentalUnit: String(data.get('unit')) || undefined,
      notes: String(data.get('notes')),
    };
    if (await updateExperiment(experiment.id, (current) => ({
      ...current,
      specimens: specimenModal === 'new' ? [...current.specimens, specimen] : current.specimens.map((item) => item.id === specimen.id ? specimen : item),
      updatedAt: new Date().toISOString(),
    }))) setSpecimenModal(null);
  };
  const saveDesign = async () => {
    const conditions = conditionDrafts.map((condition) => ({ ...condition, name: condition.name.trim(), description: condition.description.trim() }));
    if (!conditions.length || conditions.some((condition) => !condition.name)) { setConditionError('Record at least one named condition before assigning specimens.'); return; }
    if (new Set(conditions.map((condition) => condition.name.toLowerCase())).size !== conditions.length) { setConditionError('Condition names must be unique within this experiment.'); return; }
    if (await updateExperiment(experiment.id, (current) => ({ ...current, variedFactor: factorDraft.trim(), conditions, updatedAt: new Date().toISOString() }))) setDesignOpen(false);
  };
  const palette = ['#BEC8D1', '#86CECB', '#E12885', '#137A7F'];
  return <div className="specimens-layout"><Panel title={<div><h2>Physical specimens and groups</h2><p className="panel-subtitle">Manage physical units independently from procedure executions and repeated observations.</p></div>} action={<><Button onClick={openDesign}><Layers3 size={16} /> Design conditions</Button><Button variant="primary" disabled={!experiment.conditions.length} onClick={() => setSpecimenModal('new')}><Plus size={16} /> Add specimen</Button></>}>
    <div className="condition-source-note"><Layers3 /><div><strong>Assignment options come from experiment design</strong><p>The deliberately varied factor is <strong>{experiment.variedFactor || 'not yet named'}</strong>. Its {experiment.conditions.length} condition{experiment.conditions.length === 1 ? '' : 's'} appear in every specimen assignment menu and remain consistent in data and analysis.</p></div><Button variant="ghost" onClick={openDesign}>Manage design</Button></div>
    {experiment.specimens.length ? <div className="table-scroll"><table><thead><tr>{header('identity', 'Identity')}{header('condition', 'Condition')}{header('unit', 'Experimental unit')}{header('runs', 'Runs', true)}{header('notes', 'Notes')}<th>Version and actions</th></tr></thead><tbody>{specimenSort.rows.map((specimen) => <tr key={specimen.id}><td><strong>{specimen.name}</strong><small className="block">{specimen.id}</small></td><td><span className="condition-label"><i style={{ background: experiment.conditions.find((item) => item.id === specimen.conditionId)?.colour }} />{experiment.conditions.find((item) => item.id === specimen.conditionId)?.name}</span></td><td>{specimen.experimentalUnit || '—'}</td><td className="numeric">{experiment.runs.filter((run) => run.specimenIds.includes(specimen.id)).length}</td><td>{specimen.notes || '—'}</td><td><span className="inline-audit-actions"><VersionAuditButton entityType="specimen" entityId={specimen.id} label={specimen.name} compact /><button className="icon-button" aria-label={`Edit ${specimen.name}`} onClick={() => setSpecimenModal(specimen)}><Pencil size={16} /></button></span></td></tr>)}</tbody></table></div> : <EmptyState title="No specimens assigned" action={<Button onClick={() => setSpecimenModal('new')}>Add first specimen</Button>}>Add physical specimens or treatment groups before recording a run.</EmptyState>}
  </Panel>
  {specimenModal && <Modal title={specimenModal === 'new' ? 'Add specimen or group' : 'Edit specimen or group'} onClose={() => setSpecimenModal(null)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void saveSpecimen(event.currentTarget); }}><Field label="Identity"><input name="name" required defaultValue={specimenModal === 'new' ? '' : specimenModal.name} /></Field><Field label="Assigned condition"><select name="condition" defaultValue={specimenModal === 'new' ? experiment.conditions[0]?.id : specimenModal.conditionId}>{experiment.conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}</select></Field><Field label="Experimental unit" hint="For group-applied treatments, record the tray, chamber or other assigned unit."><input name="unit" defaultValue={specimenModal === 'new' ? '' : specimenModal.experimentalUnit} /></Field><Field label="Notes"><textarea name="notes" rows={3} defaultValue={specimenModal === 'new' ? '' : specimenModal.notes} /></Field><div className="form-actions"><Button type="button" onClick={() => setSpecimenModal(null)}>Cancel</Button><Button variant="primary" type="submit">Save specimen</Button></div></form></Modal>}
  {designOpen && <Modal title="Experiment conditions" onClose={() => setDesignOpen(false)} wide><div className="form-stack"><div className="condition-design-explainer"><Layers3 /><p>Conditions belong to the experiment design. Renaming one keeps its stable identity, existing specimen assignments, measurements, and analysis grouping intact.</p></div><Field label="Deliberately varied factor"><input value={factorDraft} onChange={(event) => setFactorDraft(event.target.value)} placeholder="What changes between conditions?" /></Field><div><span className="field-label">Conditions available to specimens</span><div className="condition-design-list">{conditionDrafts.map((condition, index) => <div key={condition.id}><i style={{ background: condition.colour }} /><Field label={`Condition ${index + 1}`}><input value={condition.name} onChange={(event) => { setConditionDrafts((current) => current.map((item) => item.id === condition.id ? { ...item, name: event.target.value } : item)); setConditionError(''); }} /></Field><Field label="Design description"><input value={condition.description} onChange={(event) => setConditionDrafts((current) => current.map((item) => item.id === condition.id ? { ...item, description: event.target.value } : item))} /></Field>{experiment.conditions.some((item) => item.id === condition.id) && <span className="condition-version-row"><small>Stable ID: {condition.id}</small><VersionAuditButton entityType="condition" entityId={condition.id} label={condition.name} compact /></span>}</div>)}</div><Button className="add-inline" onClick={() => setConditionDrafts((current) => [...current, { id: uid('condition'), name: '', description: '', colour: palette[current.length % palette.length] }])}><Plus size={16} /> Add condition</Button></div>{conditionError && <p className="form-error revision-validation" role="alert">{conditionError}</p>}<div className="preservation-note"><Layers3 /> Existing conditions are not deleted here, so specimen and measurement references remain valid.</div><div className="form-actions"><Button onClick={() => setDesignOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveDesign()}>Save experiment design</Button></div></div></Modal>}
  </div>;
}
