---
title: Preserve methods and record runs
description: Create immutable procedure revisions, assess exact methods, and retain execution provenance.
weight: 20
---

## 3. Preserve and validate the actual procedure

Use **Method** to edit the written procedure. Saving a genuine title, ordered-step, equipment, or
context-note change creates a new immutable procedure revision. It never rewrites a revision already
linked to a run.

{{< screenshot src="method-validation.png" alt="Method tab showing the vessel cooling procedure editor and immutable revision audit trail" caption="The procedure revision records what was written. Validation is a separate assessment rather than another procedure revision." >}}

Add validation evidence from **Overview → Validation & review → Evidence**, then select **Assess
revision** under Method validation. For a post-execution assessment:

- **Decision:** `Validated for intended use` only when the evidence supports that exact claim;
- **Reviewer:** the person accountable for the assessment;
- **Assessed at:** the actual decision time;
- **Retrospective:** remains selected when execution happened before assessment;
- **Intended use:** repeat the bounded use supported by the evidence;
- **Limitations:** state excluded conditions and uncertainty;
- **Scientific rationale:** explain how the selected evidence leads to the decision.

{{< screenshot src="method-assessment-fields.png" alt="Method validation assessment form showing decision, reviewer, date, retrospective status, intended use, limitations, and rationale" caption="A retrospective assessment can validate the exact procedure used without pretending that validation occurred before execution." >}}

Never relink an old run to a later method revision merely to remove a readiness warning. If two
revisions have exactly the same normalized title, steps, equipment, and notes, the assessment form
may offer them as additional targets. Coverage occurs only when they are explicitly selected.

## 4. Add specimens and runs

Add each independently observed physical item under **Specimens**. Example identities are
`Foam assembly 1`, `Foam assembly 2`, and `Foam assembly 3`. Assign each to its design condition.
Use **Experimental unit** when treatment is applied to a shared unit such as one tray, chamber, or
water bath; this prevents a group from being mistaken for independent replication.

Create a run for each procedure execution. Record the method revision, associated specimens,
operator, instrument configuration, cycle number, times, and deviations.

{{< screenshot src="runs-and-executions.png" alt="Runs tab for the thermal experiment showing procedure executions, statuses, specimen counts, and timing" caption="A run is one execution of a procedure revision. It is not the same thing as a specimen or an individual reading." >}}

Once a run has measurements, its method revision and measured specimens are locked. Correct other
run details with a reason, but use method validation—not historical relinking—to address later
evidence.


## When validation arrives after results exist

Suppose twelve runs used procedure v1 and only then a reference comparison is completed.

1. Keep every run linked to v1.
2. Add the reference comparison under **Validation evidence**.
3. Open **Method → Assess revision** for v1.
4. Record the actual assessment date and keep **Retrospective assessment** selected.
5. State the supported intended use and limitations.
6. Link the evidence and explain the rationale.
7. Confirm the report labels v1 **Retrospectively validated**.

If v2 changes only validation metadata from an older workspace and its normalized procedure is
identical, explicitly select both revisions if the assessment genuinely covers both. If any procedure
content differs, assess each revision separately.
