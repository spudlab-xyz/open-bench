---
title: Build the scientific context
description: Record observation sources, instruments, calibration, evidence, and review in the right order.
weight: 30
---

Open **Overview → Scientific record**. Add records that describe the evidence actually used rather than
ideal records that were not available during the work.

## Observation sources

Select **Source** and record the acquisition kind, provider or dataset identity where relevant, source
URL, retrieval time, licence, attribution, permission status, and redistribution note. Use separate
sources when observations came from materially different origins.

{{< screenshot src="source-provenance-form.png" alt="Observation source form with source kind, provider identifiers, URL, licence, attribution, and permission fields" caption="Record both technical provenance and rights information. Processing a source does not grant permission to redistribute it." >}}

A source describes where observations came from. It does not replace the measurement's own acquisition
time, operator, original timestamp, or source-observation identifier.

## Instruments and calibration

1. Add the instrument first, including a stable name, sensor type, model or serial number where known,
   resolution, location, and notes.
2. Select **Calibration** and choose that instrument.
3. Record when calibration occurred, any validity end, the procedure, result, responsible person,
   coefficients, notes, and supporting attachment.
4. Keep failed and expired calibration records. Add a later calibration rather than rewriting history.

A calibration only supports readings when it applies to the instrument and acquisition period. Readiness
uses the latest recorded calibration as a warning aid; scientific judgement must still consider which
calibration was in force for each observation.

## Validation evidence

Use **Validation & review → Evidence** for worked examples, reference datasets, tool comparisons,
uncertainty analyses, hardware tests, or assumption reviews. Record the conditions covered and known
limitations, not just a pass/fail label. Attach supporting images from the Report tab first when needed.

Validation evidence does not validate a method by itself. Link the applicable evidence when recording
an independent assessment on the **Method** tab.

## Scientific review

Choose a scope that matches the decision:

- **Experiment**, **Conclusion**, and **Report** automatically target the current experiment record.
- **Method** presents labelled procedure revisions.
- **Analysis** presents labelled saved-analysis revisions, including stale status where applicable.

Record the reviewer, decision, assumptions, and comments. Report approval applies to the current data
revision and becomes outdated when measurements change.

Use **Edit** to correct an existing scientific record with a reason. Use **Add** only for a genuinely
separate source, instrument, calibration event, evidence item, or review.
