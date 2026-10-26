---
title: Write, review, and release
description: Separate conclusions, report review, readiness, and release status.
weight: 40
---

## 7. Write the conclusion separately

On **Report**, select **Edit conclusions** and record:

- **Conclusion:** the interpretation supported by the selected analysis;
- **Limitations:** conditions, uncertainty, missingness, deviations, and generalisation boundaries;
- **Follow-up questions:** useful next studies rather than unsupported claims;
- **Author:** who made the interpretation.

The conclusion is linked to the current data and analysis revisions. Later evidence changes mark it
stale.

{{< screenshot src="experiment-report.png" alt="Generated experiment report showing readiness, question, method, results, conclusions, and provenance sections" caption="The report presents recorded evidence, calculations, researcher interpretation, validation classification, and release history without collapsing them into one claim." >}}

## 8. Record a report review

Return to **Overview → Validation & review → Review** and choose **Report** scope. OpenBench links the
current report automatically. Enter the reviewer, decision, and comments.

{{< screenshot src="scientific-review-fields.png" alt="Scientific review form with scope, review target, reviewer, decision, and comments" caption="Report, Experiment, and Conclusion target the current record automatically. Method and Analysis reviews use a labelled revision selector." >}}

Example comments:

> Reviewed source permissions, method assessment, calibration status, quality flags, selected
> analysis revision, conclusion boundaries, and report wording. Approved for internal comparison of
> the recorded bench assemblies only.

A report approval applies only to the **current data revision**. New or corrected measurements
increase that revision, so the previous approval remains in history but no longer clears current
readiness.

## 9. Record report status

Select **Report → Review / release**. **Reviewed** and **Released** are blocked while readiness issues
remain. A draft snapshot can record the current state without claiming readiness.

{{< screenshot src="report-release-fields.png" alt="Review or release report form showing status, responsible person, limitations acknowledgement, and unresolved readiness issues" caption="A report review is evidence of scientific review; a report release is a separate status record. Both are retained in history." >}}

For a release, name the responsible person and acknowledge the recorded limitations. The release is
still a browser-local prototype record, not a certified report.
