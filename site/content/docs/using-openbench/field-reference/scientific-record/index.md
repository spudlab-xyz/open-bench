---
title: Scientific record and method validation fields
description: Understand sources, instruments, calibration, evidence, procedures, and method assessments.
weight: 20
---

## Scientific context

### Intended use

Experiment intended use describes what the overall study can support. Method-assessment intended use
describes what a particular procedure revision has been validated to support. They are related but
not interchangeable.

### Observation source

| Field | Meaning | Example or guidance |
|---|---|---|
| Source name | Recognisable name for the origin of observations. | `Manual bench observations` |
| Capture/source kind | Manual, CSV, instrument, provider, calculated, or legacy/unknown origin. | Choose the actual acquisition path. |
| Provider | Organisation supplying external data. | Leave empty for team-generated observations. |
| Dataset identifier | Provider's stable dataset/version identifier. | Prefer a versioned DOI or release ID. |
| Station identifier | Monitoring station or collection-site identifier. | Use only when supplied by the source. |
| Source URL | Resolvable source or metadata location. | Link to the dataset landing page rather than a transient download where possible. |
| Retrieved at | When external data was obtained. | Important when providers update datasets. |
| Licence | Licence governing use. | Record the exact licence name/version. |
| Required attribution | Text that must accompany reuse. | Preserve provider wording. |
| Permission review | Not reviewed, permitted, restricted, or prohibited. | Import does not itself grant permission. |
| Permission note | Redistribution and usage constraints. | Explain restrictions and reviewer basis. |

### Instrument and calibration

| Field | Meaning | Example or guidance |
|---|---|---|
| Instrument name | Local identity used by runs and measurements. | `Digital probe T-02` |
| Sensor/type | Measurement principle or equipment class. | `Thermistor temperature probe` |
| Manufacturer/model/serial | Hardware identity. | Record serial number when individual calibration matters. |
| Resolution/precision | Instrument display or specified resolution, not observed uncertainty. | `0.1 °C` |
| Location | Normal installation or bench location. | `Thermal bench A` |
| Instrument notes | Configuration or known behaviour. | Firmware, range, or logging mode. |
| Calibrated at / valid until | Calibration event and validity boundary. | Use explicit local date/time; OpenBench stores an instant. |
| Calibration result | Passed, limited, failed, or unknown. | **Limited** requires explanation of usable range. |
| Responsible person | Person accountable for the calibration record. | Full name or controlled local identifier. |
| Coefficients/correction function | Applied or available conversion details. | Include units and formula meaning. |
| Calibration procedure | Standard, reference, and process used. | Identify reference equipment where possible. |
| Supporting attachments | Files supporting the calibration. | Certificate or worked comparison. |

## Validation evidence

| Field | Meaning | Example or guidance |
|---|---|---|
| Evidence title | Recognisable evidence item. | `Probe comparison against reference thermometer` |
| Evidence kind | Worked example, reference dataset, tool comparison, uncertainty analysis, hardware test, or assumption review. | Choose the closest actual evidence type. |
| Result | Not reviewed, supports use, limited support, or failed. | The result classifies this evidence item, not the whole method. |
| Summary | What was done and observed. | Include sample/range and principal result. |
| Conditions covered | Domain tested by this evidence. | `20–85 °C in water bath.` |
| Known limitations | Boundaries or weaknesses. | `No assessment below 20 °C.` |
| Supporting attachments | Local files that substantiate the record. | Attachment bytes require a complete archive for backup. |

## Method procedure revisions

| Field | Meaning | Example or guidance |
|---|---|---|
| Method title | Identity of the written procedure. | `Vessel cooling comparison` |
| Ordered steps | Exact sequence expected during a run. | Include timings, quantities, and observations. |
| Equipment | Required apparatus and configuration. | `Four matched 300 mL vessels; probe T-02; timer.` |
| Contextual notes | Procedure-wide detail that is not an execution deviation. | `Probe depth marked at 35 mm.` |
| Revision reason | Why procedure content changed. | `Standardise probe depth after pilot runs.` |
| Save for reuse | Stores the latest procedure content as a workspace template. | A later experiment receives a fresh revision and must be validated independently. |

Saving creates a revision only when title, steps, equipment, or notes change. Validation belongs in a
method-validation assessment, not in a procedure revision.

## Method-validation assessment


| Field | Meaning | Example or guidance |
|---|---|---|
| Decision | Pending, validated for intended use, limited, or failed. | **Validated** is bounded by intended use and limitations. |
| Reviewer | Person accountable for the decision. | Not merely the data-entry operator unless they performed the review. |
| Assessed at | When the decision was made. | Do not backdate to procedure creation. |
| Retrospective assessment | Validation occurred after one or more covered executions. | Automatically retained when execution predates assessment. |
| Identical revision coverage | Additional exact procedure matches explicitly covered by this assessment. | Never select based only on similar titles. |
| Intended use | Use supported by the assessment. | `Compare recorded assemblies under the specified bench protocol.` |
| Limitations and conditions | Boundaries on the decision. | Temperature range, apparatus, operator, uncertainty, sample limitations. |
| Supporting evidence | Structured evidence items used in the decision. | Select only evidence actually considered. |
| Scientific rationale | Reasoning connecting evidence to decision. | Explain support, conflict, and residual uncertainty. |

### Effective labels

| Label | Meaning |
|---|---|
| Prospectively validated | Applicable validation was recorded before covered execution. |
| Retrospectively validated | Applicable validation was recorded after execution and remains disclosed. |
| Limited validation | Evidence supports only a restricted claim; readiness remains unresolved. |
| Validation failed | The applicable assessment rejected use; readiness remains unresolved. |
| Validation pending | No decision has been reached. |
| Legacy approved | Compatibility status from an approved method review or exact legacy embedded validation. |
| Unvalidated | No applicable assessment or compatibility approval exists. |


See [Preserve methods and record runs](../../guided-journeys/methods-and-runs/) for an illustrated assessment example.
