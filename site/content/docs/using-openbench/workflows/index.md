---
title: Prototype workflow
description: Follow an investigation from project planning through reporting.
weight: 10
---

For a complete worked example with screenshots, start with [Guided journeys](../guided-journeys/).
For definitions and examples for each major form field, use the [Field reference](../field-reference/).
For imports, readiness troubleshooting, archive recovery, and other specific actions, use the
[Practical task guides](../task-guides/).

## Organise related work

Projects provide shared context and status for related experiments. Their dashboards summarise
experiment, run, and reading activity without combining the underlying scientific records.

### Tutorial: update project details or lifecycle status

Project details and status use separate controls so ordinary administrative edits do not bypass the
lifecycle record.

1. Open a project dashboard.
2. Select **Edit project** to change its name, description, or colour. Select **Save project
   details**, then enter the required audit reason. The project receives its next version without
   changing status or lifecycle events.
3. Select **Update lifecycle** when the project's status changes. Choose the new status and enter the
   mandatory lifecycle note explaining the transition.
4. Inspect the project's **vN** chip for its version timeline. The dashboard's **Lifecycle history**
   continues to show the status transitions and their permanent notes separately.

### Delete a project

Open the project dashboard and select **Delete project**. The confirmation lists every experiment,
procedure execution, measurement, and attachment affected. Enter the project name exactly and give
a deletion reason before selecting **Delete project and experiments**.

Deletion removes the project and all of its experiments from active browser storage so experiments
cannot be left referring to a missing project. The project, experiments, and nested record snapshots
remain searchable as deletion tombstones in **Version history**, with the supplied reason. Reusable
methods saved at workspace level remain available. Attachment files are permanently removed and
cannot be recovered from version history, so export a complete browser archive first when needed.

## Define an experiment

The guided setup records the experiment's question, varied factor, measured outcome, unit,
conditions, controls, equipment, procedure, and measurement schedule. Planning can remain
incomplete; OpenBench highlights gaps rather than treating existing measurements as invalid.

After creation, complete the experiment overview's **Scientific record** with intended use, source
permissions, instruments, calibration, validation evidence, and review. See
[Scientific records and readiness](../scientific-records/) for the full workflow.

## Preserve method history

Methods are revisioned. A new revision records why a procedure changed, while previous revisions
remain available for comparison. Runs refer to the procedure execution, keeping the written method
separate from what happened on a particular occasion.

The Procedure editor's **vN · Procedure revision** indicator is the canonical revision used by runs.
The Revision audit trail retains every immutable procedure snapshot. Select **Compare** on an earlier
revision to compare it with the next one, or on the latest revision to compare previous → latest.
OpenBench rejects a revision when the title, ordered steps, equipment, and notes have not actually
changed. Validation decisions, evidence, intended use, and limitations are recorded separately and
do not create procedure revisions.

Select **Save for reuse** to keep a workspace-level snapshot of the latest procedure. During a later
experiment's setup, **Start from a saved procedure** copies its title, steps, equipment, and notes into
a fresh experiment-owned revision 1. Validation decisions and evidence links are deliberately not
copied. See [Save and reuse a procedure](../task-guides/reuse-methods/).

### Validate the procedure actually used

The **Method validation** panel lists every procedure revision used by a run and the latest procedure
revision. Select **Assess revision** to record a pending, validated, limited, or failed decision with
its reviewer, date, evidence, intended use, limitations, and scientific rationale.

If runs already used the revision, the assessment is retained as **Retrospectively validated**.
Historical runs remain linked to that revision; they are never moved to a later method merely to
clear readiness. Revisions with exactly matching normalized procedure content can be included in one
assessment, but each additional revision must be explicitly selected. Materially different
procedures require separate assessments.

All other persisted records use the same versioning principle. New items start at version 1;
changes require a reason and preserve a timestamped snapshot. See
[Version history and comparisons](../version-history/) for a timeline and comparison tutorial.

## Record specimens, runs, and measurements

- **Specimens** identify the physical subjects or samples and their assigned conditions.
- **Runs** record individual procedure executions and their timing.
- **Measurements** retain values, units, context, quality state, and correction history.

CSV import supports measurement capture and presents a preview before data is saved. Tables can be
filtered and sorted to inspect larger sets of records.

Run names in an experiment overview's **Recent runs** table link directly to the execution detail,
where its context, measurements, deviations, version history, and edit action are available.

### Tutorial: correct a run or record deviations

1. Open an experiment's **Runs** tab and select **Edit** beside the run, or open its detail page and
   select **Edit run**.
2. Correct the run identity, start/completion time, status, method revision, associated specimens,
   cycle number, or **Execution-specific deviations**.
3. Once measurements exist, the method revision and measured specimens are locked. They cannot be
   changed because each measurement must retain the procedure and run/specimen context actually
   recorded. Resolve later validation through a method-validation assessment instead.
4. Select **Save run changes**. If values changed, enter the required reason in the audit prompt.
   Cancelling that prompt leaves the run unchanged.
5. Open the run's **vN** chip to inspect the new version, reason, timestamp, and before/after
   snapshots. The dedicated **Mark complete** action remains available for the normal completion
   workflow and records its generated system reason.

## Analyse without overwriting evidence

Charts and descriptive summaries are calculated from the current records. They do not replace the
original measurements. Researcher-authored conclusions, limitations, and follow-up ideas are kept
separate from calculated findings so interpretation remains explicit.

Saving an existing named analysis creates another revision only when its source data revision,
settings, exclusions, or research notes changed. Re-submitting the same analysis is rejected rather
than adding an audit-only revision.

## Share a copy

Settings can export a versioned experiment as JSON. Imports are validated, identifiers are remapped,
and a separate local copy is created rather than merging with or overwriting an existing experiment.
See [Data storage and safety](../data-safety/) before relying on an export as a backup.
