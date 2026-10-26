---
title: Manage projects, conditions, and specimens
description: Change administrative and experimental-design records without breaking scientific references.
weight: 40
---

## Project details and lifecycle

On a project dashboard, use **Edit project** for name, description, or colour. A substantive edit asks
for an audit reason but does not alter lifecycle status.

Use **Update lifecycle** for a status transition. Record why the project became active, paused,
completed, or archived. Lifecycle events remain separate from ordinary project versions.

{{< screenshot src="project-lifecycle-form.png" alt="Project lifecycle form showing current status, new status, and required permanent lifecycle note" caption="Lifecycle changes have their own permanent note and remain separate from edits to project name, description, or colour." >}}

## Delete a project safely

**Delete project** removes the project and all active experiments beneath it. Before confirming:

1. Review the displayed experiment, run, measurement, and attachment impact.
2. Export a complete browser archive if attachment bytes or active records may be needed again.
3. Enter the project name exactly and give a meaningful deletion reason.

Record snapshots and deletion tombstones remain searchable in **History**, but attachment bytes are
permanently removed. Workspace-level saved procedures are not deleted with the project.

## Edit conditions

Open **Specimens → Design conditions**. Renaming a condition keeps its stable ID, specimen assignments,
measurements, and analysis grouping. New conditions receive new IDs.

Existing conditions cannot be removed in this editor because specimens and evidence may refer to them.
Do not rename a condition to represent a different treatment; add a new condition instead.

{{< screenshot src="condition-design-form.png" alt="Experiment condition editor showing stable IDs, names, descriptions, version controls, and preservation notice" caption="Renaming preserves stable condition identity and existing references. Add a condition when the treatment itself is new." >}}

## Add or edit specimens

A specimen is a physical subject, sample, or deliberately grouped unit. Record:

- a stable human identity;
- its assigned condition;
- the experimental unit where treatment applies to a tray, chamber, batch, or other shared unit;
- factual notes needed to identify or handle it.

Editing a specimen preserves its stable ID and records a new version. Once measurements exist, run
method and measured-specimen links are locked; correct descriptive metadata rather than changing the
recorded experimental history.
