---
title: Execution and measurement fields
description: Understand runs, values, acquisition context, quality, missingness, and CSV import.
weight: 30
---

## Runs

| Field | Meaning | Example or guidance |
|---|---|---|
| Run identity | Unique human-readable execution name. | `Cooling run 10` |
| Start/completion | Actual execution times in the browser's stated time zone. | Completion cannot precede start. |
| Method revision | Exact immutable procedure used. | Locks after measurements exist. |
| Status | Planned, running, or complete. | Complete runs require completion time. |
| Cycle number | Repeated cycle on the same specimen. | A repeat cycle does not create another independent specimen. |
| Associated specimens | Physical items participating in the run. | Measured specimens lock to the run. |
| Operator/recorder | Person responsible for execution record. | Use a consistent local naming policy. |
| Deviation impact | None, unknown, minor, or material to interpretation. | Choose material when conclusions may change. |
| Instrument configuration | Registered instruments used in this execution. | Supports calibration checks. |
| Execution-specific deviations | What differed from the selected procedure revision. | Record facts, timing, and likely impact. |

## Measurements


### Identity and value

| Field | Meaning | Example or guidance |
|---|---|---|
| Specimen | Physical item observed. | Must belong to the selected run. |
| Run | Procedure execution that produced the observation. | Carries method and execution context. |
| Elapsed time / observation date | Planned point represented by the reading. | Thermal experiments use minutes; plant studies use dates. |
| Measured value | Numeric observation in the variable's explicit unit. | Never encode missing as zero. |
| Value kind | Raw, corrected, derived, estimate, or forecast. | Raw is directly observed; derived is calculated from other values. |
| Uncertainty | Quantified uncertainty in the same measurement domain. | Do not substitute instrument resolution without justification. |
| Recorded precision | Number of decimal places actually recorded. | `1` for `79.4 °C`. |
| Detection limit | Boundary below which the method cannot quantify reliably. | Use quality **Below detection limit** when applicable. |

### Acquisition and provenance

| Field | Meaning | Example or guidance |
|---|---|---|
| Acquisition method | Manual, CSV, instrument, provider, calculated, or legacy/unknown. | Describe how this record entered the evidence chain. |
| Source | Registered observation source. | Select the source rather than repeating its metadata. |
| Source observation ID | Original row, record, or provider identifier. | Enables reconciliation with source data. |
| Operator/recorder | Person who observed or entered the value. | May differ from run operator. |
| Acquired at | Actual observation/acquisition instant. | Distinct from when OpenBench stores the record. |
| Original timestamp text | Unmodified timestamp supplied by a source. | Preserve ambiguous legacy text rather than silently interpreting it. |
| Clock assumption | Time-zone, clock-offset, or conversion assumption. | `Source logger configured to Europe/London.` |
| Instrument | Registered device used. | Links measurement to instrument identity. |
| Calibration | Calibration applicable to this reading. | Select the event actually in force. |
| Sampling interval | Interval represented by a sample or logger record. | Include units, e.g. `10 s`. |
| Collection method | Sampling and observation procedure. | `Probe immersed at 35 mm after gentle stir.` |
| Location / precision | Place and spatial precision. | Avoid false precision in coordinates or site names. |

### Quality and notes

| Field | Meaning | Example or guidance |
|---|---|---|
| Quality | Valid, needs review, suspect, invalid, below detection, or estimated. | Non-valid states require context. |
| Quality rationale | Why the state was assigned. | `Probe moved during reading; retain but treat as suspect.` |
| Quality reviewer | Person assigning or confirming the quality state. | Record when review is substantive. |
| Notes | Observation-specific context not captured elsewhere. | Keep interpretation in conclusions, not measurement notes. |

### Missing observation

| Field | Meaning |
|---|---|
| Expected point | When the observation should have occurred. |
| Missing reason | Not collected, instrument failure, not applicable, below detection, lost sample, or unknown. |
| Notes | Factual explanation and any recovery action. |

## CSV import

| Field or step | Meaning |
|---|---|
| File | CSV whose bytes are hashed for provenance. |
| Column mapping | Maps specimen, run, point, value, unit, and optional notes. |
| Unit column | Must agree with the experiment's explicit outcome unit. |
| Preview | Shows valid rows and retains rejected rows with errors. |
| Source name | Provenance name created for imported observations. |
| Attribution | Required credit for the source. |
| Permission status/note | Records whether use and redistribution have been reviewed. |
| Permission acknowledgement | Confirms that import itself does not grant rights. |


See [Record measurements and analyse](../../guided-journeys/measurements-and-analysis/) for illustrated measurement entry and inspection.
