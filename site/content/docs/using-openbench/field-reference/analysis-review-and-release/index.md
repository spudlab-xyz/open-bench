---
title: Analysis, review, and release fields
description: Understand analysis settings, conclusions, review targets, readiness, and report status.
weight: 40
---

## Analysis

| Field | Meaning | Example or guidance |
|---|---|---|
| Variable | Outcome to summarise. | `Water temperature (°C)` |
| Grouping | Assigned condition; fixed by specimen design. | Prevents ad hoc regrouping from being hidden. |
| Comparison | Exact observed point or final minus baseline. | No interpolation between absent points. |
| Baseline/final point | Exact points used for change. | Choose points present in the evidence. |
| Conditions | Design groups included. | Omitted groups remain visible in settings. |
| Specimens/runs | Optional subset. | Use exclusions transparently rather than deleting evidence. |
| Show trajectories/chart type | Presentation settings. | They do not change stored observations. |
| Exclusion reason | Why a measurement is omitted from this analysis. | Scientific or quality rationale, not desired outcome. |
| Research notes | Interpretation of analysis choices. | Keep final claims in the conclusion. |
| Analysis name | Stable human name whose later saves create revisions. | `Water temperature at 30 min` |

Saved analyses retain source data revision, included measurements, exclusions, algorithm/application
versions, formula, aggregation rule, rounding policy, snapshot, and checksum.

## Conclusions, reviews, and releases

### Conclusion

| Field | Meaning |
|---|---|
| Conclusion | Researcher interpretation supported by the linked evidence. |
| Limitations | Reasons the interpretation may not generalise or may be uncertain. |
| Follow-up questions | New questions, not retroactive changes to the original hypothesis. |
| Author | Person accountable for the interpretation. |

### Scientific review


| Field | Meaning | What to enter |
|---|---|---|
| Review scope | Boundary of the review decision. | Experiment, Method, Analysis, Conclusion, or Report. |
| Review target | Stable record the review addresses. | Current-record scopes are automatic; Method and Analysis use a labelled selector. |
| Reviewer | Person accountable for review. | Use a meaningful identity. |
| Decision | Pending, approved, changes requested, or rejected. | Approval should match the comments and evidence reviewed. |
| Scientific assumptions and comments | What was checked, assumptions, requested changes, and decision basis. | Be specific enough for a later reader to reconstruct scope. |

#### How is the review target selected?

| Scope | Target guidance |
|---|---|
| Experiment | OpenBench automatically links the current experiment. |
| Report | OpenBench automatically links the current experiment report. This is the normal scope for clearing the current report-review readiness item. |
| Conclusion | OpenBench automatically links the current conclusion record. |
| Method | Choose the labelled method revision. A method-validation assessment is preferred for new validation decisions. |
| Analysis | Choose the labelled saved-analysis revision; stale analyses are identified. |

Internal IDs remain stored for audit and exchange, but users do not need to discover or type them in
the normal review workflow.

Every review records the current **data revision**. If measurements change, an older approved report
review remains auditable but no longer approves the current report.

### Report release


| Field | Meaning |
|---|---|
| Report status | Draft snapshot, reviewed, released, or withdrawn. |
| Responsible person | Person recording or owning the status decision. |
| Limitations acknowledgement | Required for release; confirms limitations were read, not that they disappeared. |
| Unresolved issues | Automated readiness findings copied into the release record. |

**Scientific review** and **report release** are different records. First record the report-scope
review in the Scientific record. Then use Report → Review / release to record distribution status.


See [Write, review, and release](../../guided-journeys/review-and-release/) for the report review and release forms.
