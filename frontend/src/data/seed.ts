import type {
  Condition,
  Experiment,
  Measurement,
  MethodRevision,
  Project,
  Run,
  Specimen,
  Workspace,
} from '../types';
import { initialiseVersionHistory } from '../domain/versioning';
import { upgradeScientificWorkspace } from '../domain/scientific';

const createdAt = '2026-09-12T09:00:00.000Z';
export const SEED_VERSION = 3;

const projects: Project[] = [
  { id: 'project-materials', name: 'Materials & heat', description: 'Bench studies of thermal performance.', colour: '#86CECB', status: 'active', createdAt, updatedAt: '2026-10-24T11:00:00.000Z', lifecycleEvents: [{ id: 'project-materials-created', status: 'active', changedAt: createdAt, note: 'Project created for active thermal performance studies.' }] },
  { id: 'project-energy', name: 'Portable energy', description: 'Controlled comparisons of cells and loads.', colour: '#E12885', status: 'completed', createdAt: '2026-08-08T09:00:00.000Z', updatedAt: '2026-08-18T16:00:00.000Z', lifecycleEvents: [{ id: 'project-energy-created', status: 'active', changedAt: '2026-08-08T09:00:00.000Z', note: 'Project created for portable energy comparisons.' }, { id: 'project-energy-completed', status: 'completed', changedAt: '2026-08-18T16:00:00.000Z', note: 'Planned fixed-load comparisons completed.' }] },
  { id: 'project-growth', name: 'Growing conditions', description: 'Longitudinal plant observations.', colour: '#137A7F', status: 'active', createdAt: '2026-07-01T09:00:00.000Z', updatedAt: '2026-08-02T16:00:00.000Z', lifecycleEvents: [{ id: 'project-growth-created', status: 'active', changedAt: '2026-07-01T09:00:00.000Z', note: 'Project created for longitudinal growing studies.' }] },
];

const method = (id: string, title: string, steps: string[], equipment: string, notes = ''): MethodRevision => ({
  id,
  version: 1,
  changeReason: 'Initial method definition.',
  title,
  steps,
  equipment,
  notes,
  createdAt,
});

function thermalExperiment(): Experiment {
  const conditions: Condition[] = [
    { id: 'thermal-unwrapped', name: 'Unwrapped', description: 'No insulation around the vessel.', colour: '#BEC8D1' },
    { id: 'thermal-felt', name: 'Felt', description: 'Two layers of 4 mm wool felt.', colour: '#86CECB' },
    { id: 'thermal-cork', name: 'Cork', description: 'A fitted 6 mm cork sleeve.', colour: '#16A3A8' },
    { id: 'thermal-foam', name: 'Foam', description: 'A fitted 8 mm closed-cell foam sleeve.', colour: '#E12885' },
  ];
  const methodRevision = method('method-thermal-v1', 'Vessel cooling comparison', [
    'Stabilise the room between 20 °C and 22 °C and record ambient temperature.',
    'Heat 250 mL of water to 80 °C in a controlled water bath.',
    'Transfer water to the labelled test assembly and fit its assigned insulation.',
    'Record water temperature at 5-minute intervals for 30 minutes.',
    'Allow the assembly to return to ambient before the next execution.',
  ], 'Four matched 300 mL vessels; digital probe T-02; timer; water bath.', 'Probe depth marked at 35 mm.');

  const specimens: Specimen[] = conditions.flatMap((condition, ci) =>
    Array.from({ length: 3 }, (_, index) => ({
      id: `thermal-assembly-${ci + 1}-${index + 1}`,
      name: `${condition.name} assembly ${index + 1}`,
      conditionId: condition.id,
      experimentalUnit: `Vessel ${String.fromCharCode(65 + ci)}${index + 1}`,
      notes: 'Matched borosilicate vessel and lid.',
    })),
  );
  const runs: Run[] = specimens.map((specimen, index) => ({
    id: `thermal-run-${String(index + 1).padStart(2, '0')}`,
    name: `Cooling run ${String(index + 1).padStart(2, '0')}`,
    specimenIds: [specimen.id],
    methodRevisionId: methodRevision.id,
    startedAt: `2026-09-${String(14 + Math.floor(index / 4)).padStart(2, '0')}T${String(9 + (index % 4) * 2).padStart(2, '0')}:00:00.000Z`,
    completedAt: `2026-09-${String(14 + Math.floor(index / 4)).padStart(2, '0')}T${String(9 + (index % 4) * 2).padStart(2, '0')}:35:00.000Z`,
    status: 'complete',
    deviations: index === 8 ? 'Room door opened briefly at minute 15.' : '',
  }));
  const rates = [0.073, 0.043, 0.033, 0.024];
  const measurements: Measurement[] = [];
  runs.forEach((run, runIndex) => {
    const conditionIndex = Math.floor(runIndex / 3);
    const specimen = specimens[runIndex];
    const ambient = 20.7 + ((runIndex % 3) - 1) * 0.25;
    const start = 80 + ((runIndex % 3) - 1) * 0.45;
    [0, 5, 10, 15, 20, 25, 30].forEach((elapsed) => {
      const modelValue = ambient + (start - ambient) * Math.exp(-rates[conditionIndex] * elapsed);
      const id = `thermal-m-${runIndex + 1}-${elapsed}`;
      const suspicious = runIndex === 7 && elapsed === 15;
      const corrected = runIndex === 3 && elapsed === 10;
      const effective = Number((modelValue + ((elapsed / 5 + runIndex) % 3 - 1) * 0.18).toFixed(1));
      measurements.push({
        id,
        specimenId: specimen.id,
        runId: run.id,
        conditionId: specimen.conditionId,
        elapsed,
        values: { waterTemperature: suspicious ? 84.7 : effective, ambientTemperature: Number(ambient.toFixed(1)) },
        quality: suspicious ? 'review' : 'valid',
        notes: suspicious ? 'Possible probe movement; inspect before analysis.' : corrected ? 'Transcription checked against probe log.' : '',
        corrections: corrected ? [{
          id: 'correction-thermal-1',
          variableId: 'waterTemperature',
          previousValue: Number((effective + 5).toFixed(1)),
          replacementValue: effective,
          reason: 'Paper worksheet digit was transposed; checked against the probe log.',
          timestamp: '2026-09-16T14:20:00.000Z',
        }] : [],
        recordedAt: run.startedAt,
      });
    });
  });
  const suspiciousId = 'thermal-m-8-15';
  return {
    id: 'exp-thermal', kind: 'thermal', code: 'EXP-024', projectId: 'project-materials',
    title: 'Thermal insulation comparison', description: 'Comparing cooling behaviour across four insulation materials.',
    question: 'Which insulation material best retains heat over 30 minutes?',
    hypothesis: 'Foam will retain the most heat because it limits conductive and convective heat transfer.', exploratory: false,
    variedFactor: 'Insulation material', measuredOutcome: 'Water temperature (°C)',
    controls: '250 mL water; matched vessels; 80 °C target start; probe depth; room location.',
    schedule: 'At 0 minutes, then every 5 minutes through 30 minutes.', status: 'complete', conditions,
    variables: [
      { id: 'waterTemperature', name: 'Water temperature', unit: '°C', role: 'outcome' },
      { id: 'ambientTemperature', name: 'Ambient temperature', unit: '°C', role: 'context' },
    ],
    methodRevisions: [methodRevision], specimens, runs, measurements,
    analyses: [{
      id: 'analysis-thermal-final', name: 'Final temperature by material', revision: 1, sourceDataRevision: 2,
      createdAt: '2026-09-18T16:00:00.000Z',
      settings: { variableId: 'waterTemperature', comparison: 'observed', selectedPoint: 30, conditionIds: conditions.map((item) => item.id), specimenIds: [], runIds: [], showTrajectories: true, chartType: 'line' },
      exclusions: [{ measurementId: suspiciousId, reason: 'Probe was displaced at minute 15; reading is not physically plausible.' }],
      notes: 'Compare measured values at exactly 30 minutes. No interpolation.',
    }],
    notes: [{ id: 'note-thermal-1', text: 'Foam remained noticeably warmest to the touch after each execution.', createdAt: '2026-09-17T15:30:00.000Z' }],
    attachments: [],
    conclusion: 'Foam retained the most heat after 30 minutes in these matched bench trials.',
    limitations: 'Only three physical assemblies per condition; small ambient variation and one probe disturbance.',
    followUp: 'Repeat with calibrated probes in every vessel and test equal-thickness insulation.',
    dataRevision: 2, createdAt, updatedAt: '2026-09-18T16:00:00.000Z',
  };
}

function batteryExperiment(): Experiment {
  const conditions: Condition[] = [
    { id: 'battery-alkaline', name: 'Alkaline A', description: 'Fresh 1.5 V alkaline AA cell.', colour: '#BEC8D1' },
    { id: 'battery-nimh', name: 'NiMH B', description: 'Fully charged 1.2 V low-self-discharge NiMH AA.', colour: '#86CECB' },
    { id: 'battery-lithium', name: 'Lithium C', description: 'Fresh primary lithium AA cell.', colour: '#E12885' },
  ];
  const methodRevision = method('method-battery-v1', 'Fixed-load discharge', [
    'Condition cells at 21 ± 1 °C for at least two hours.',
    'Record specimen identity and open-circuit starting voltage.',
    'Connect the specimen to the 100 Ω ± 1% resistive load.',
    'Record loaded voltage and measured current hourly for six hours.',
    'Disconnect the load after the final reading.',
  ], '100 Ω 1% load; multimeter D-04; insulated cell holder; timer.', 'Capacity and energy are intentionally not estimated.');
  const specimens: Specimen[] = conditions.flatMap((condition, ci) => Array.from({ length: 2 }, (_, index) => ({
    id: `battery-cell-${ci + 1}-${index + 1}`, name: `${condition.name} cell ${index + 1}`, conditionId: condition.id,
    experimentalUnit: `Cell lot ${ci + 1}-${index + 1}`, notes: index === 0 && ci === 0 ? 'Used for a documented repeat cycle after recharge was not applicable; rested 24 h.' : 'First discharge cycle.',
  })));
  const runs: Run[] = specimens.map((specimen, index) => ({
    id: `battery-run-${index + 1}`, name: `Discharge ${index + 1}`, specimenIds: [specimen.id], methodRevisionId: methodRevision.id,
    startedAt: `2026-08-${String(10 + index).padStart(2, '0')}T09:00:00.000Z`, completedAt: `2026-08-${String(10 + index).padStart(2, '0')}T15:00:00.000Z`, status: 'complete', cycle: 1, deviations: '',
  }));
  runs.push({ id: 'battery-run-repeat', name: 'Discharge 7 — repeat cycle', specimenIds: [specimens[0].id], methodRevisionId: methodRevision.id, startedAt: '2026-08-18T09:00:00.000Z', completedAt: '2026-08-18T15:00:00.000Z', status: 'complete', cycle: 2, deviations: 'Repeated on the same physical alkaline cell after a 24-hour rest; not an independent specimen.' });
  const measurements: Measurement[] = [];
  runs.forEach((run, runIndex) => {
    const specimen = specimens.find((item) => item.id === run.specimenIds[0])!;
    const conditionIndex = conditions.findIndex((item) => item.id === specimen.conditionId);
    const startVoltages = [1.56, 1.38, 1.78];
    const drops = [0.075, 0.038, 0.027];
    [0, 1, 2, 3, 4, 5, 6].forEach((elapsed) => {
      const repeatPenalty = run.cycle === 2 ? 0.08 : 0;
      const voltage = startVoltages[conditionIndex] - repeatPenalty - drops[conditionIndex] * elapsed - 0.006 * elapsed * elapsed + (runIndex % 2) * 0.012;
      measurements.push({
        id: `battery-m-${runIndex + 1}-${elapsed}`, specimenId: specimen.id, runId: run.id, conditionId: specimen.conditionId, elapsed,
        values: { voltage: Number(voltage.toFixed(3)), current: Number((voltage / 100 * 1000).toFixed(1)) }, quality: 'valid', notes: '', corrections: [], recordedAt: run.startedAt,
      });
    });
  });
  return {
    id: 'exp-battery', kind: 'battery', code: 'EXP-031', projectId: 'project-energy', title: 'Battery discharge comparison',
    description: 'Comparing loaded voltage profiles under a fixed recorded resistance.', question: 'How do three AA battery models maintain voltage under a 100 Ω load?',
    hypothesis: 'Primary lithium cells will maintain loaded voltage most consistently.', exploratory: false, variedFactor: 'Battery model', measuredOutcome: 'Loaded voltage (V)',
    controls: '100 Ω load; room temperature; holder; meter; observation interval.', schedule: 'At connection, then hourly for six hours.', status: 'complete', conditions,
    variables: [{ id: 'voltage', name: 'Loaded voltage', unit: 'V', role: 'outcome' }, { id: 'current', name: 'Measured current', unit: 'mA', role: 'context' }],
    methodRevisions: [methodRevision], specimens, runs, measurements, analyses: [],
    notes: [{ id: 'note-battery-1', text: 'Repeat cycle on Alkaline A cell 1 is labelled as the same specimen and must not increase independent sample count.', createdAt: '2026-08-18T16:00:00.000Z' }], attachments: [],
    conclusion: 'Lithium C maintained the highest voltage throughout this six-hour fixed-load observation.', limitations: 'Short duration and small specimen count; the repeated alkaline cycle is not independent.', followUp: 'Extend the observation duration without adding capacity or energy estimates until current sampling is validated.',
    dataRevision: 1, createdAt: '2026-08-08T09:00:00.000Z', updatedAt: '2026-08-18T16:00:00.000Z',
  };
}

function plantExperiment(): Experiment {
  const conditions: Condition[] = [
    { id: 'plant-control', name: 'Control', description: 'Standard potting mix and window light.', colour: '#BEC8D1' },
    { id: 'plant-compost', name: 'Compost tea', description: 'Weekly diluted compost tea.', colour: '#137A7F' },
    { id: 'plant-light', name: 'Grow light', description: 'Standard mix with 12-hour grow-light exposure.', colour: '#E12885' },
  ];
  const methodRevision = method('method-plant-v1', 'Six-week seedling growth', [
    'Randomly assign germinated bean seedlings to labelled trays.',
    'Apply the assigned treatment to each tray; keep soil mass and water volume constant.',
    'Measure height from soil line to the highest stem point each Monday.',
    'Record missed observations as missing; do not estimate them.',
    'Rotate tray positions after every weekly observation.',
  ], 'Nine 1 L pots; three trays; metric ruler; grow light; watering cylinder.', 'Treatment is applied at tray level, recorded as the experimental unit.');
  const specimens: Specimen[] = conditions.flatMap((condition, ci) => Array.from({ length: 3 }, (_, index) => ({
    id: `plant-${ci + 1}-${index + 1}`, name: `${condition.name} plant ${index + 1}`, conditionId: condition.id,
    experimentalUnit: `Tray ${String.fromCharCode(65 + ci)}`, notes: 'Bean seedling, emergence within the same 24-hour period.',
  })));
  const runs: Run[] = conditions.map((condition, index) => ({
    id: `plant-run-${index + 1}`, name: `Tray ${String.fromCharCode(65 + index)} growth run`, specimenIds: specimens.filter((item) => item.conditionId === condition.id).map((item) => item.id),
    methodRevisionId: methodRevision.id, startedAt: '2026-07-06T08:00:00.000Z', completedAt: '2026-08-10T09:00:00.000Z', status: 'complete', deviations: index === 1 ? 'Tray B watering delayed by four hours in week 3.' : '',
  }));
  const dates = ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10'];
  const rates = [2.45, 3.05, 3.55];
  const measurements: Measurement[] = [];
  specimens.forEach((specimen, specimenIndex) => {
    const conditionIndex = conditions.findIndex((item) => item.id === specimen.conditionId);
    const run = runs[conditionIndex];
    dates.forEach((date, week) => {
      if (specimenIndex === 4 && week === 3) return;
      const height = 4.6 + (specimenIndex % 3) * 0.35 + rates[conditionIndex] * week + 0.22 * week * week + ((week + specimenIndex) % 2) * 0.18;
      measurements.push({
        id: `plant-m-${specimenIndex + 1}-${week}`, specimenId: specimen.id, runId: run.id, conditionId: specimen.conditionId,
        observedAt: date, values: { height: Number(height.toFixed(1)) }, quality: 'valid', notes: specimenIndex === 4 && week === 4 ? 'Previous week missing while observer was away.' : '', corrections: [], recordedAt: `${date}T09:00:00.000Z`,
      });
    });
  });
  return {
    id: 'exp-plant', kind: 'plant', code: 'EXP-036', projectId: 'project-growth', title: 'Plant growth under different conditions',
    description: 'Following individual bean seedlings across three tray-level growing conditions.', question: 'How do compost tea and supplemental light affect bean seedling height over six weeks?',
    hypothesis: undefined, exploratory: true, variedFactor: 'Growing condition assigned to tray', measuredOutcome: 'Plant height (cm)', controls: 'Cultivar; soil mass; pot size; water volume; measurement day.',
    schedule: 'Weekly on Mondays for six weeks.', status: 'complete', conditions,
    variables: [{ id: 'height', name: 'Plant height', unit: 'cm', role: 'outcome' }], methodRevisions: [methodRevision], specimens, runs, measurements, analyses: [],
    notes: [{ id: 'note-plant-1', text: 'One Compost tea plant observation is genuinely missing; it was not replaced or interpolated.', createdAt: '2026-08-03T09:30:00.000Z' }], attachments: [],
    conclusion: 'Plants under the grow light were tallest at the final observation, with visible variation among individual plants.', limitations: 'Treatment was assigned by tray, so plants within a tray are not independent treatment replicates.', followUp: 'Repeat with multiple independently assigned trays per condition.',
    dataRevision: 1, createdAt: '2026-07-01T09:00:00.000Z', updatedAt: '2026-08-10T10:00:00.000Z',
  };
}

function surfaceHeatingExperiment(): Experiment {
  const conditions: Condition[] = [
    { id: 'surface-black', name: 'Matte black', description: 'Aluminium plate with matte black coating.', colour: '#E12885' },
    { id: 'surface-white', name: 'Matte white', description: 'Matched aluminium plate with matte white coating.', colour: '#86CECB' },
  ];
  const methodRevision = method('method-surface-v1', 'Radiant heating comparison', [
    'Condition matched aluminium plates at room temperature for 30 minutes.',
    'Position the plate 25 cm below the fixed radiant lamp.',
    'Record surface and ambient temperature before switching on the lamp.',
    'Record surface temperature every 5 minutes for 20 minutes.',
    'Switch off the lamp and allow the plate to return to ambient.',
  ], 'Six matched aluminium plates; 60 W radiant lamp; infrared thermometer; distance jig; timer.', 'Emissivity setting fixed for every reading.');
  const specimens: Specimen[] = conditions.flatMap((condition, conditionIndex) => Array.from({ length: 3 }, (_, index) => ({
    id: `surface-plate-${conditionIndex + 1}-${index + 1}`,
    name: `${condition.name} plate ${index + 1}`,
    conditionId: condition.id,
    experimentalUnit: `Plate ${conditionIndex === 0 ? 'B' : 'W'}${index + 1}`,
    notes: 'Matched 100 × 100 × 2 mm aluminium plate.',
  })));
  const runs: Run[] = specimens.map((specimen, index) => ({
    id: `surface-run-${index + 1}`,
    name: `Heating run ${index + 1}`,
    specimenIds: [specimen.id],
    methodRevisionId: methodRevision.id,
    startedAt: `2026-10-${String(20 + index).padStart(2, '0')}T10:00:00.000Z`,
    completedAt: index < 5 ? `2026-10-${String(20 + index).padStart(2, '0')}T10:25:00.000Z` : undefined,
    status: index < 5 ? 'complete' : 'planned',
    deviations: index === 3 ? 'Lamp warm-up took 40 seconds longer than the other executions.' : '',
  }));
  const measurements: Measurement[] = [];
  runs.filter((run) => run.status === 'complete').forEach((run, runIndex) => {
    const specimen = specimens[runIndex];
    const black = specimen.conditionId === 'surface-black';
    const ambient = 21.5 + (runIndex % 3) * 0.2;
    [0, 5, 10, 15, 20].forEach((elapsed) => {
      const plateau = black ? 58 : 43;
      const surface = ambient + (plateau - ambient) * (1 - Math.exp(-0.105 * elapsed)) + (runIndex % 3 - 1) * 0.35;
      measurements.push({
        id: `surface-m-${runIndex + 1}-${elapsed}`,
        specimenId: specimen.id,
        runId: run.id,
        conditionId: specimen.conditionId,
        elapsed,
        values: { surfaceTemperature: Number(surface.toFixed(1)), ambientTemperature: Number(ambient.toFixed(1)) },
        quality: 'valid', notes: '', corrections: [], recordedAt: run.startedAt,
      });
    });
  });
  return {
    id: 'exp-surface', kind: 'thermal', code: 'EXP-041', projectId: 'project-materials',
    title: 'Surface colour and radiant heating', description: 'Comparing how matched dark and light surfaces warm beneath a fixed radiant source.',
    question: 'How does matte surface colour affect plate temperature during 20 minutes of radiant heating?',
    hypothesis: 'Matte black plates will reach a higher surface temperature than matte white plates.', exploratory: false,
    variedFactor: 'Surface colour', measuredOutcome: 'Surface temperature (°C)', controls: 'Plate material and dimensions; lamp power; distance; room position; measurement interval.',
    schedule: 'At baseline, then every 5 minutes through 20 minutes.', status: 'in-progress', conditions,
    variables: [{ id: 'surfaceTemperature', name: 'Surface temperature', unit: '°C', role: 'outcome' }, { id: 'ambientTemperature', name: 'Ambient temperature', unit: '°C', role: 'context' }],
    methodRevisions: [methodRevision], specimens, runs, measurements, analyses: [],
    notes: [{ id: 'note-surface-1', text: 'Five of six planned executions are complete; the final white-plate run remains scheduled.', createdAt: '2026-10-24T11:00:00.000Z' }], attachments: [],
    conclusion: '', limitations: '', followUp: '', dataRevision: 1,
    createdAt: '2026-10-18T09:00:00.000Z', updatedAt: '2026-10-24T11:00:00.000Z',
  };
}

export function createSeedWorkspace(): Workspace {
  const experiments = [thermalExperiment(), surfaceHeatingExperiment(), batteryExperiment(), plantExperiment()];
  return initialiseVersionHistory(upgradeScientificWorkspace({
    schemaVersion: 4,
    seedVersion: SEED_VERSION,
    projects,
    experiments,
    savedMethods: experiments.map((item) => item.methodRevisions[0]),
    versionHistory: [],
  }));
}

export function upgradeSeedWorkspace(workspace: Workspace): Workspace {
  if (workspace.seedVersion >= SEED_VERSION) return workspace;
  let experiments = workspace.experiments;
  if (workspace.seedVersion < 2) {
    const additionalExperiment = surfaceHeatingExperiment();
    experiments = experiments.some((experiment) => experiment.id === additionalExperiment.id)
      ? experiments
      : [...experiments, additionalExperiment];
  }
  const migratedAt = new Date().toISOString();
  const upgradedProjects = workspace.projects.map((project) => {
    const legacy = project as Project & Partial<Pick<Project, 'status' | 'createdAt' | 'updatedAt' | 'lifecycleEvents'>>;
    const related = experiments.filter((experiment) => experiment.projectId === project.id);
    const status = legacy.status ?? 'active';
    const projectCreatedAt = legacy.createdAt ?? related.map((experiment) => experiment.createdAt).sort()[0] ?? migratedAt;
    const projectUpdatedAt = legacy.updatedAt ?? related.map((experiment) => experiment.updatedAt).sort().at(-1) ?? migratedAt;
    return {
      ...project,
      status,
      createdAt: projectCreatedAt,
      updatedAt: projectUpdatedAt,
      lifecycleEvents: legacy.lifecycleEvents?.length ? legacy.lifecycleEvents : [{
        id: `lifecycle-${project.id}-migrated`,
        status,
        changedAt: migratedAt,
        note: 'Lifecycle tracking initialised for this existing project.',
      }],
    };
  });
  return initialiseVersionHistory({
    ...workspace,
    schemaVersion: 4,
    seedVersion: SEED_VERSION,
    projects: upgradedProjects,
    experiments,
  });
}
