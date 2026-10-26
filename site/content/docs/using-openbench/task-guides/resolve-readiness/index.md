---
title: Resolve readiness issues
description: Find the record behind each readiness warning and correct it without rewriting evidence.
weight: 10
---

Open an experiment's **Overview** tab. The **Scientific readiness** panel is an automated checklist,
not a scientific approval. Resolve a warning by improving the relevant record; do not change evidence
merely to make the warning disappear.

See [Plan an experiment](../../guided-journeys/first-experiment/) for an illustrated readiness panel.

## Warning-to-action guide

| Warning | Where to go | Safe action |
|---|---|---|
| Research question is not recorded | **Overview → Edit overview** | State the specific comparison or observation. |
| Varied factor is not recorded | **Specimens → Design conditions** | Name the deliberately varied factor. Existing condition IDs remain stable. |
| Measured outcome is not recorded | **Overview → Edit overview** | Name the primary outcome and add its explicit unit. |
| A variable has no explicit unit | **Overview → Edit overview** | Record the physical unit, or `dimensionless` where justified. |
| Measurement schedule is not recorded | **Overview → Edit overview** | Record expected points or observation timing. |
| Intended use is not recorded | **Overview → Scientific record → Intended use** | State the decisions or comparisons the experiment may support. |
| Conditions of use and limitations are not recorded | **Scientific record → Intended use** | State where the results should not be applied. |
| No observation source or provenance record is defined | **Scientific record → Source** | Add the actual manual, CSV, instrument, provider, calculated, or legacy source. |
| Observation sources lack usable permission review | **Scientific record → Sources → Edit** | Record the real permission status and redistribution limits. Do not mark a prohibited source permitted merely to clear readiness. |
| Method revision lacks applicable validation | **Method → Method validation** | Assess the exact revision used by runs. Preserve retrospective timing where execution happened first. |
| Measurements have unresolved quality flags | **Data → Inspect** | Review each flagged observation. Correct with a reason, or retain the flag and account for it in analysis and limitations. |
| Latest saved analysis is stale | **Analysis** | Re-run the intended settings against the current data and save a new analysis revision. |
| Researcher conclusion is stale | **Report → Edit conclusions** | Reconsider the interpretation against the current data, method, and analysis revisions. |
| No approved report review exists for the current data revision | **Overview → Scientific record → Review** | Choose **Report**, review the current evidence, and record the defensible decision. |
| Instrument has no, failed, or expired calibration | **Scientific record → Instruments & calibration** | Add or correct the applicable calibration. Retain failed/expired history and explain affected readings. |
| Conclusion exists without limitations | **Report → Edit conclusions** | Record uncertainty, deviations, missingness, and generalisation boundaries. |

## Recommended order

1. Complete planning, intended use, provenance, and calibration first.
2. Assess the procedure revisions actually used; never relink historical runs to a later method.
3. Resolve or retain measurement-quality findings honestly.
4. Refresh the analysis, then the conclusion.
5. Record the report-scope scientific review last because it applies to the current data revision.
6. Use **Report → Review / release** only after the scientific review. Release status is a separate record.

If a warning remains after a correction, confirm that you edited the record used by the current run or
analysis—not merely a newer record. See [Scientific records and readiness](../../scientific-records/)
for the underlying evidence boundaries.
