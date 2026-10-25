---
title: Prototype workflow
description: Follow an investigation from project planning through reporting.
weight: 10
---

## Organise related work

Projects provide shared context and status for related experiments. Their dashboards summarise
experiment, run, and reading activity without combining the underlying scientific records.

## Define an experiment

The guided setup records the experiment's question, varied factor, measured outcome, unit,
conditions, controls, equipment, procedure, and measurement schedule. Planning can remain
incomplete; OpenBench highlights gaps rather than treating existing measurements as invalid.

## Preserve method history

Methods are revisioned. A new revision records why a procedure changed, while previous revisions
remain available for comparison. Runs refer to the procedure execution, keeping the written method
separate from what happened on a particular occasion.

## Record specimens, runs, and measurements

- **Specimens** identify the physical subjects or samples and their assigned conditions.
- **Runs** record individual procedure executions and their timing.
- **Measurements** retain values, units, context, quality state, and correction history.

CSV import supports measurement capture and presents a preview before data is saved. Tables can be
filtered and sorted to inspect larger sets of records.

## Analyse without overwriting evidence

Charts and descriptive summaries are calculated from the current records. They do not replace the
original measurements. Researcher-authored conclusions, limitations, and follow-up ideas are kept
separate from calculated findings so interpretation remains explicit.

## Share a copy

Settings can export a versioned experiment as JSON. Imports are validated, identifiers are remapped,
and a separate local copy is created rather than merging with or overwriting an existing experiment.
See [Data storage and safety](../data-safety/) before relying on an export as a backup.
