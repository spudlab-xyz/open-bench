---
title: Version history and comparisons
description: Record reasons for changes, inspect timelines, and compare retained snapshots.
weight: 15
---

OpenBench keeps an append-only history for every persisted record in the browser workspace. This
includes projects, experiment planning, conditions, variables, methods, specimens, runs,
method-validation assessments, measurements, analyses, researcher conclusions, notes, attachment
metadata, and nested audit records.

## How versioning works

- A newly created item receives **version 1** with an initial-version record.
- Changing an existing item creates the next version and preserves the previous snapshot. Submitting
  unchanged data does not create another version.
- A user-initiated change cannot be saved without a reason.
- Deterministic actions, such as completing a run or importing validated measurements, record a
  specific system reason instead of asking for one.
- Deleting an item removes it from active views but retains a final tombstone and its earlier
  snapshots in History.
- Every version states its date, time, UTC offset, and IANA time zone when displayed.

## Check history while viewing a record

Active records display a version-history chip wherever they are reviewed, including project and
experiment lists and the main views for specimens, runs, measurements, analyses,
conclusions, notes, and attachments.

- **v1 · Initial** means the record has not changed since it was created.
- **v3 · 2 changes** means the active record is at ledger version 3 and two later audit events exist
  after its initial snapshot.
- A highlighted chip makes changed records easy to distinguish from initial-only records.

Select the chip to open the record's audit dialog. The dialog shows the current version, change
count, latest audit time, and every revision's operation, reason, source, timestamp, and inspectable
snapshot. Select **Open full history and compare** to open the same record on the global History page
and compare any two versions.

Methods also have an immutable procedure-revision series that can predate the workspace-wide ledger.
The Procedure editor therefore displays its canonical **vN · Procedure revision** and provides its
own inspect and adjacent-comparison controls. Method records remain searchable in global History,
where ledger version numbers describe retained workspace audit events rather than renumbering the
procedure revisions referenced by runs.

## Tutorial: inspect an item's timeline

1. Open **History** in the main navigation.
2. The page initially lists only records that changed after creation. Version 1 creation events are
   hidden so the audit feed remains focused as the workspace grows.
3. Search by item name, type, or identifier.
4. Select the item. The newest version number and deletion state appear in the item list.
5. Read the timeline from newest to oldest. Each entry shows its operation, reason, source, and
   timestamp.
6. Expand **Inspect snapshot** on any entry to view the complete retained data for that version.

Enable **Include initial versions** to show unchanged records and version 1 creation events. Initial
snapshots are never deleted: even when hidden from the timeline, version 1 remains available in the
comparison selectors as the baseline for a changed record. Opening full history from an unchanged
record's in-context **v1 · Initial** chip enables this view automatically.

Deleted items remain searchable and carry a **Deleted** badge.

## Tutorial: compare two versions

1. Select an item with at least two versions.
2. In **Compare versions**, choose an earlier and later version.
3. Review the field-by-field list. Added, removed, and changed values are shown side by side.
4. Use the timeline reasons and timestamps to understand why and when each difference occurred.

Method revisions and measurement corrections retain their domain-specific audit information as well
as appearing in the workspace history.

## Reasons for changes

When a change affects an existing item, OpenBench opens a **Reason for this change** dialog. Describe
the scientific, procedural, or administrative reason rather than restating the edited value. Closing
or cancelling the dialog cancels the change.

## Export and reset boundaries

Experiment JSON exports contain the current experiment snapshot and embedded scientific records;
they do not contain the workspace-wide version timeline or attachment bytes. Resetting the demo
workspace replaces active records and removes attachment bytes, but retained version records remain
available as tombstones and reset events.
