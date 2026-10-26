---
title: Scientific records and readiness
description: Capture provenance, measurement context, validation evidence, and review boundaries.
weight: 12
---

OpenBench implements the SpudLab scientific principles as transparent frontend concepts. These
features help describe evidence and limitations; they do not certify a method or independently
validate a scientific claim.

## Build the scientific record

Open an experiment overview and use **Scientific record** to:

1. State the experiment's intended use and conditions where results should not be applied.
2. Register observation sources, provider/dataset/station identifiers, source URLs, licence,
   attribution, permission status, and redistribution notes.
3. Register instruments and sensor metadata, then add dated calibration results, validity periods,
   coefficients, responsible people, and supporting attachments.
4. Add validation evidence from worked examples, reference datasets, tool comparisons, uncertainty
   analyses, assumption reviews, or hardware tests.
5. Record scientific review decisions against the current data revision.

The readiness summary reports unresolved provenance, method validation, calibration, quality,
analysis, conclusion, limitation, and report-review issues.

See the [scientific-record field reference](../field-reference/scientific-record/) for every source, instrument,
calibration, evidence, and review field. The [Guided journeys](../guided-journeys/) include a complete
example from readiness issues to report release.

### Assess method validation without rewriting runs

Procedure revisions describe what was done; method-validation assessments describe whether an exact
procedure is fit for an intended use. Use the experiment's **Method** tab to assess any revision used
by runs. Record the decision, reviewer, assessment time, evidence, intended use, limitations, and
rationale. If execution occurred first, OpenBench labels the result **Retrospectively validated** and
retains that disclosure in reports.

Never move historical runs to a later method revision simply to clear readiness. Once measurements
exist, the run's method link is locked. One assessment may explicitly cover multiple revisions only
when their normalized title, steps, equipment, and notes match exactly; different procedures need
separate evidence and assessment.

### Record a report review

Use **Validation & review → Review** and choose **Report**. OpenBench targets the current report
automatically. Record the reviewer, decision, and comments describing what
was checked. Approval applies to the current data revision; changing measurements requires another
review. This scientific review is separate from the later **Report → Review / release** status record.

### Correct a scientific record

Use **Edit** beside an existing source, instrument, calibration, validation-evidence item, or review
to correct the active record. The form opens with its current fields and supporting attachments
selected. Saving a substantive correction keeps the same stable ID, asks for a change reason, and
adds an immutable audit version. Submitting an unchanged form adds no version.

Use the section's **Add** action only when recording a genuinely separate source, instrument,
calibration event, evidence item, or review. Readiness is recalculated immediately after a saved
correction—for example, when a source's permission status changes from **Not reviewed** to
**Permitted**, a failed calibration is corrected, or a pending current-revision review is approved.

## Preserve observation meaning

Manual capture records the source and acquisition method, operator, acquisition time, original
timestamp text, time zone and clock assumptions, instrument and calibration, collection method,
sampling interval, location, and precision. Each value can be marked raw, corrected, derived,
estimated, or forecast and can carry uncertainty, precision, and a detection limit.

Quality states include valid under recorded checks, needs review, suspect, invalid, below detection
limit, and estimated. Non-valid observations require context. Expected readings that were not
collected are stored separately with a missing reason; they are not converted to zero.

CSV import retains the source filename and SHA-256 hash, mapping, original rows, accepted row
numbers, rejected rows and errors, and a permission acknowledgement. Importing data does not grant
permission to redistribute it.

## Reproduce and review results

Named analyses record the exact source data revision, included measurements, exclusions, algorithm
and application version, formula, aggregation rule, rounding policy, result snapshot, and checksum.
Condition lines are labelled as derived means. Missing values are not interpolated.

Changing data makes older analyses stale. Conclusions record their supporting data and analysis
revision and also become stale when evidence changes. Reports show these boundaries and cannot be
marked reviewed or released until automated readiness issues are resolved and a current report
review exists. Release records retain the responsible person, method/analysis/data revisions,
application version, limitations acknowledgement, unresolved issues, and checksum.
