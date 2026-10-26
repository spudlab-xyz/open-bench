---
title: Plan an experiment
description: Start with a question, define the design, and record intended use and provenance.
weight: 10
---

Start on the dashboard to choose an existing experiment or create a new one. Attention items point to
records that need review; they do not combine or reinterpret evidence from separate experiments.

{{< screenshot src="workspace-home.png" alt="OpenBench dashboard showing seeded experiments, project collections, attention items, and recent runs" caption="The dashboard is a navigation and attention view. It does not combine evidence from separate experiments." >}}

## 1. Create the project and experiment

Create a project when several experiments share a purpose. For example:

- **Project name:** `Materials and heat`
- **Description:** `Bench comparisons of thermal performance under controlled room conditions.`
- **Initial lifecycle status:** `Active`

Then select **New experiment**. A defensible planning example is:

- **Title:** `Thermal insulation comparison`
- **Question:** `Which insulation material best retains heat over 30 minutes?`
- **Hypothesis:** `Foam will retain the most heat because it limits conductive and convective transfer.`
- **Varied factor:** `Insulation material`
- **Measured outcome:** `Water temperature`
- **Unit:** `°C`
- **Conditions:** `Unwrapped`, `Felt`, `Cork`, and `Foam`
- **Schedule:** `Every 5 minutes from 0 to 30 minutes`

Use **Exploratory** when there is no directional hypothesis. Do not invent a hypothesis after seeing
the results; the exploratory flag makes that boundary explicit.

{{< screenshot src="experiment-setup.png" alt="First step of the new experiment wizard with title, research question, exploratory, hypothesis, and project fields" caption="Planning starts with the question. Only the title is required to create a workspace, but readiness continues to identify missing scientific context." >}}

The [planning and design field reference](../../field-reference/planning-and-design/) explains each planning field.

## 2. Complete intended use and provenance

Open the experiment **Overview**. The readiness panel is a checklist, not a validity score. Resolve
items by recording real information, not by entering placeholders.

For this example:

- **Intended use:** `Compare heat retention of these four bench assemblies over 30 minutes.`
- **Conditions and limitations:** `Applies to the recorded vessels, fill volume, room range, probe
  placement, and insulation thicknesses; not a building-insulation rating.`
- **Source:** create `Manual bench observations`, kind `Manual`, with permission `Permitted` because
  the observations were produced by the team for this experiment.
- **Instrument:** record the temperature probe's manufacturer, model, serial number, resolution, and
  bench location.
- **Calibration:** link the probe, date, procedure, result, responsible person, and any correction
  coefficients.

{{< screenshot src="experiment-overview.png" alt="Thermal insulation experiment overview showing scientific readiness issues, record sections, design counts, and chart" caption="Readiness names missing provenance, method validation, quality, and report review. It does not alter measurements or silently approve a record." >}}
