---
title: Back up and restore
description: Choose the correct export, preserve attachments and history, and understand browser-local boundaries.
weight: 60
---

## Make a recoverable hand-off

Use the right export for the purpose:

1. **Experiment JSON** creates a portable current experiment snapshot. It excludes attachment bytes
   and the workspace-wide history.
2. **Complete browser archive** includes the schema-v4 workspace, append-only history, scientific
   records, release records, and locally available attachment bytes with hashes.
3. Validate an archive before restoring it.
4. Keep a copy outside the browser profile.
5. Remember that another browser, hostname, port, or profile has separate IndexedDB storage.

{{< screenshot src="data-safety-settings.png" alt="Settings page showing experiment exchange, complete browser archive, backup limitations, and reset controls" caption="Use a complete browser archive for backup. Plain JSON exchange is for a current experiment copy, not complete recovery." >}}

Read [Data storage and safety](../../data-safety/) before using real records.
