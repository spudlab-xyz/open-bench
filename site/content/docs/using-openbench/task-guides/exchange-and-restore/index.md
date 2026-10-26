---
title: Exchange experiments and restore archives
description: Transfer the right package, understand replacement behavior, and recover from validation failures.
weight: 70
---

Open **Settings** and choose the package that matches the purpose.

See [Back up and restore](../../guided-journeys/backup-and-restore/) for the illustrated Settings screen.

## Experiment JSON: create a separate copy

Use **JSON sharing → Export** for a portable snapshot of one experiment. Import validates the structure,
remaps identifiers, and creates a separate local experiment; it never merges with or overwrites an
existing experiment.

JSON includes current scientific structure and attachment metadata, but excludes attachment bytes and
the workspace-wide version ledger. After import, check the new experiment's project placement,
provenance note, methods, runs, measurements, and attachment availability.

## Complete browser archive: recover a workspace

Use **Export complete archive** for the workspace, append-only history, raw import provenance, review
and release records, and available attachment bytes with hashes. Read any documented omission count
before treating the file as recoverable.

To restore:

1. Keep a copy of the current workspace archive before replacing anything.
2. Select **Validate and restore archive** and choose the archive JSON.
3. Read the confirmation count. Restore replaces active workspace records; changed or absent current
   records are represented in version history.
4. After success, confirm experiment counts, integrity issues, representative history, and attachments.

## If validation or restore fails

| Message type | Safe response |
|---|---|
| Invalid JSON or unsupported schema | Use an unmodified OpenBench export. Do not hand-edit IDs to bypass validation. |
| Duplicate or broken identifier/reference | Return to the source workspace and create a fresh archive. |
| Attachment size or hash mismatch | Treat the file as damaged or altered; restore from another verified copy. |
| Documented omitted attachment | Restore may preserve metadata without bytes. Locate the original file or another archive. |
| Browser storage/write failure | Preserve the archive, check available storage and browser policy, then retry in a supported normal profile. |

Do not repeatedly restore an uncertain archive into the only browser profile holding valuable data.
See [Data storage and safety](../../data-safety/) for the browser-local boundary.
