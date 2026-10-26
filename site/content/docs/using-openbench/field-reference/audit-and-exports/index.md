---
title: Audit and export fields
description: Understand version labels, data boundaries, exchange, archives, and reset behavior.
weight: 50
---

## Version and audit fields

| Field or label | Meaning |
|---|---|
| `v1 · Initial` | Initial retained snapshot with no later changes. |
| `v3 · 2 changes` | Current ledger version 3 with two events after creation. |
| Change reason | Required explanation for a user change to an existing record. |
| Operation | Created, updated, or deleted. |
| Source | User or deterministic system action. |
| Timestamp | Stored instant, displayed with UTC offset and browser IANA zone. |
| Procedure revision vN | Immutable domain revision referenced by runs; separate from ledger event numbering. |
| Data revision | Experiment evidence revision used to detect stale analyses, conclusions, and report reviews. |
| Analysis revision | Revision of a named analysis and its settings/snapshot. |

## Exports and archives

| Control | Includes | Does not include / caution |
|---|---|---|
| Export experiment JSON | Current experiment structure and embedded scientific records. | No attachment bytes and no workspace-wide version timeline. |
| Import experiment JSON | Validates and remaps a separate copy. | Does not merge into the original experiment. |
| Complete browser archive | Entire workspace, audit ledger, scientific records, releases, and available attachment bytes with hashes. | Still a browser-local prototype archive, not a certified laboratory package. |
| Reset demo workspace | Restores deterministic active examples. | Replaces active local records and removes attachment bytes; export first. |

See [Guided journeys](../../guided-journeys/) for complete examples and [Data storage and safety](../../data-safety/)
for browser-local persistence boundaries.
