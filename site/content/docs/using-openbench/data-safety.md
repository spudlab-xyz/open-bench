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
complete attachment backup.

## Resetting the demo

**Settings → Reset demo workspace** restores the original three seeded experiments. It permanently
removes local changes and attachment bytes for this origin. Export any experiment records you want
to inspect later before confirming the reset, while remembering the attachment limitation above.
