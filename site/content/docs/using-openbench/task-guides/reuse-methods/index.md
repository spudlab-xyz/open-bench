---
title: Save and reuse a procedure
description: Start another experiment from procedure content without carrying across validation claims.
weight: 50
---

## Save a procedure

Open an experiment's **Method** tab and select **Save for reuse**. OpenBench stores a workspace-level
snapshot of the latest procedure revision. Saving it does not change that revision or any run.

The saved content includes the method title, ordered steps, equipment, and contextual notes. It remains
available if its original project is later deleted.

## Reuse it during setup

1. Select **New experiment** and complete the question and design steps.
2. On **Outline the procedure**, choose a value under **Start from a saved procedure**.
3. Review and edit the copied method title, equipment, ordered steps, and contextual notes.
4. Complete the measurement schedule, intended use, and limitations.
5. Create the experiment.

{{< screenshot src="saved-procedure-setup.png" alt="Final experiment setup step populated from a saved vessel cooling procedure" caption="A saved procedure populates editable title, equipment, ordered steps, and notes. The new experiment still receives its own revision identity and validation lifecycle." >}}

OpenBench creates a new experiment-owned revision 1 with a fresh ID. Its audit reason identifies the
saved procedure used as the starting point. Later edits create revisions within the new experiment.

## What is deliberately not copied

Method-validation decisions, intended-use claims embedded in legacy methods, evidence links, run links,
and assessment reviewers are not transferred. Validation concerns fitness for a specific intended use
and evidence context; copied procedure text must therefore be assessed independently in the new
experiment.
