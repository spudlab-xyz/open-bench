---
title: Planning and design fields
description: Understand project, experiment, condition, and specimen fields.
weight: 10
---

## Projects

| Field | Meaning | Example or guidance |
|---|---|---|
| Project name | Human-readable collection of related experiments. | `Materials and heat` |
| Description | Scope shared by the collection, not an experiment conclusion. | `Bench comparisons of thermal performance.` |
| Lifecycle status | Planning/operational state managed separately from ordinary details. | Use **Active** only while work is active. |
| Project colour | Visual navigation aid; it has no scientific meaning. | Choose a distinguishable colour. |
| Lifecycle note | Permanent reason for a status transition. | `Planned cooling comparisons completed.` |
| Deletion confirmation | Exact project name required before cascading deletion. | Prevents accidental removal. |
| Deletion reason | Audit reason copied to deletion tombstones. | Explain why the project and experiments are removed. |

## Experiment planning


| Field | Meaning | Example or guidance |
|---|---|---|
| Experiment title | Concise identity for this specific investigation. | `Thermal insulation comparison` |
| Research question | Specific observable comparison. | `Which insulation material best retains heat over 30 minutes?` |
| Exploratory | Records that no directional hypothesis was specified in advance. | Select before inspecting outcomes when the study is exploratory. |
| Hypothesis | Pre-specified directional expectation and rationale. | Do not rewrite it after results are known. |
| Project | Collection that owns the experiment. | `Materials and heat` |
| What are you changing? | Deliberately varied factor. | `Insulation material` |
| What are you measuring? | Primary numerical outcome. | `Water temperature` |
| Measurement unit | Unit attached to the outcome definition and displays. | `°C`; use `dimensionless` explicitly when appropriate. |
| Conditions | Design levels, one per line. | `Unwrapped`, `Felt`, `Cork`, `Foam` |
| Controls/context | Factors held constant or recorded to interpret differences. | Fill volume, vessel geometry, room range, probe depth. |
| Equipment and context | Apparatus required by the procedure. | Include identifying details where available. |
| Ordered steps | Procedure sequence, one step per line. | Write observable actions and timings. |
| Measurement schedule | Planned points or dates. | `0, 5, 10, 15, 20, 25, and 30 min` |
| Intended use | Decisions or comparisons this experiment is designed to support. | Keep narrower than the broad topic. |
| Conditions and limitations | Where results should not be applied. | State scale, environment, materials, and untested conditions. |

## Conditions and specimens

| Field | Meaning | Example or guidance |
|---|---|---|
| Deliberately varied factor | Design dimension that distinguishes conditions. | `Insulation material` |
| Condition name | Short stable design label. | `Foam` |
| Design description | Operational definition of that condition. | `Fitted 8 mm closed-cell foam sleeve.` |
| Identity | Physical specimen or group label. | `Foam assembly 1` |
| Assigned condition | Design condition applied to the specimen. | `Foam` |
| Experimental unit | Smallest independently assigned treatment unit. | Record a tray or chamber when several observations share treatment application. |
| Notes | Specimen-specific facts known before or during use. | Damage, batch, dimensions, or preparation context. |

Renaming a condition keeps its stable ID and existing references. A specimen is not automatically an
independent replicate: use **Experimental unit** to expose shared treatment units.
