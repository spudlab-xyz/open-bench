---
title: Write conclusions and manage attachments
description: Keep interpretation, notes, photographs, provenance, and report output within their proper boundaries.
weight: 60
---

## Write a conclusion

On **Report**, choose **Edit conclusions** after saving the analysis you intend to interpret. Record:

- the conclusion supported by the selected evidence;
- limitations, uncertainty, missingness, deviations, and generalisation boundaries;
- follow-up questions as future work rather than retroactive hypothesis changes;
- the accountable author.

The conclusion stores its supporting data, analysis, and method revisions. It becomes stale when those
evidence boundaries change.

## Add research notes

Research notes retain dated context but do not replace measurements, deviations, analysis notes, or a
conclusion. Use a note for observations about the investigation as a whole. Open its version control to
inspect later corrections.

## Add supporting photographs

1. In **Notes, attachments and provenance**, select **Add photograph**.
2. Choose an image no larger than 5 MiB and add a meaningful caption.
3. After storage, use **View** to confirm the browser can retrieve the bytes.
4. Link the photograph from a calibration or validation-evidence form where it supports that record.

{{< screenshot src="attachment-form.png" alt="Add local photograph form showing image selection, five MiB limit, caption, and JSON export warning" caption="Photograph bytes stay in IndexedDB. Plain experiment JSON carries metadata only; a complete browser archive is required for available bytes." >}}

Attachment metadata belongs to the experiment record; bytes remain separately in this browser's
IndexedDB. Removing a photograph permanently removes its local bytes. Plain experiment JSON contains
metadata but not bytes. Use a complete browser archive when the files must travel with the workspace.

## Print or save a report

**Print / save as PDF** uses the browser's print facility. Review the preview and selected paper/output
settings. A printout is a presentation of the current report, not a controlled archive and not a
substitute for the complete browser archive.
