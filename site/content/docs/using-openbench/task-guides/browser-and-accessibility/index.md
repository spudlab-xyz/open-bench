---
title: Browser and accessibility guidance
description: Use OpenBench with browser storage, keyboard controls, printing, and known prototype limitations in mind.
weight: 80
---

## Browser requirements

OpenBench requires a current browser with JavaScript, IndexedDB, Web Crypto, file download/upload, and
standard form support. The documentation screenshot lightbox uses native dialog support when available
and otherwise leaves each screenshot as a direct image link.

No formal cross-browser certification matrix is published for this prototype. Before relying on a
browser/profile combination, create disposable records, reload the page, export an archive, and verify
a restore in a separate test profile.

## Keyboard use

- Use **Tab** and **Shift+Tab** to move through links, controls, tables, and modal actions.
- Use **Enter** or **Space** to activate the focused control according to normal browser behavior.
- Press **Escape** to close application modals or enlarged documentation screenshots.
- Opening a documentation screenshot moves focus to its close control; closing it restores focus to
  the screenshot link.
- Sortable table headers are buttons and expose the active direction visually.

Do not depend on colour alone: statuses also use labels, and screenshot alternative text describes the
relevant screen. Report accessibility defects with the browser, page, action, expected result, and
whether keyboard or assistive technology was used.

## Zoom, small screens, and reduced space

Use browser zoom rather than resizing scientific values in source data. Wide data tables may scroll
horizontally. Modals and screenshots are constrained to the viewport; close them before navigating to
a different application route.

## Storage and private browsing

Normal and private profiles have separate storage, and private data may be discarded automatically.
Different ports, hostnames, browsers, devices, and profiles are separate workspaces. Clearing site data
can remove active records and attachments.

## Printing

Report printing uses the browser print dialog. Check page breaks, headers, scaling, and whether the
chosen output is PDF or paper. Printed output is not an archive, does not contain interactive history,
and is not a certified scientific record.
