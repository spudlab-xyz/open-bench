---
title: Data storage and safety
description: Understand browser persistence, exports, attachments, and reset behaviour.
weight: 20
---

## Browser-local storage

The prototype stores experiment records in IndexedDB for the current browser and origin. It does not
send experiment records, notes, or attachments to an external service. The MySQL container does not
currently persist product data.

This has practical consequences:

- another browser, browser profile, device, hostname, or port has a separate workspace;
- clearing site data can remove the workspace;
- private-browsing policies may discard data;
- the Vite development origin and Docker-hosted origin do not share records.

Use demonstration or disposable data while evaluating the prototype. It is not a production backup
or laboratory records system.

## JSON export limits

Experiment JSON includes structure, method history, specimens, runs, measurement corrections,
analyses, conclusions, and attachment **metadata**. Attachment bytes are stored separately in
IndexedDB and are not included in plain JSON exports. An experiment export is therefore not a
complete attachment backup. The workspace-wide version timeline is also not included; exports
represent the current experiment snapshot.

## Complete browser archive

**Settings → Complete browser archive** creates a separate schema-v4 archive containing the full
workspace, append-only version ledger, source/import provenance, method-validation assessments,
scientific reviews, report release
records, and every attachment byte still available in this browser. Attachment bytes carry SHA-256
hashes, and the manifest records integrity findings and any unavailable files.

Archive restore validates identifiers, scientific-context references, attachment sizes, and hashes
before applying data. It remains a browser-local prototype: keep independent backups and do not
treat an archive or browser printout as a certified laboratory record.

## Resetting the demo

**Settings → Reset demo workspace** restores the original four seeded experiments. It permanently
replaces active local records and removes attachment bytes for this origin. Version snapshots and
deletion tombstones remain in **History**. Export any current experiment records you want to inspect
later before confirming the reset, while remembering the attachment and history limitations above.
