---
title: Project status
description: What OpenBench is today, and what remains intentionally undecided.
weight: 30
---

OpenBench by SpudLab is a **planned single-user scientific experiment tracker and analyser**.
The repository currently contains an interactive frontend prototype and an operational deployment
scaffold. It is a place to test workflows and information structure, not a production laboratory
record system.

## Available today

- A React and TypeScript prototype for projects, experiments, specimens, method revisions, runs,
  measurements, notes, attachments, analyses, reports, and conclusions.
- Browser-local IndexedDB persistence with deterministic demonstration records.
- Versioned JSON export and validated import of experiment records.
- A Spring Boot service with a database-backed operational health check.
- A Compose deployment that serves the frontend through Nginx and keeps the backend and MySQL on a
  private network.

## Important boundaries

The backend does not yet provide product APIs, entities, repositories, or product persistence.
MySQL is part of the operational scaffold but does not store experiment records. Hosting,
licensing, pricing, and the final production architecture remain open decisions.

The current application preserves a deliberate distinction between source observations,
calculated findings, and researcher conclusions. Future product work should retain that boundary
and the planned single-user scope unless the project explicitly decides otherwise.

## Technology

| Area | Current choice |
|---|---|
| Frontend prototype | React 19, TypeScript 7, Vite 8 |
| Browser storage | IndexedDB |
| Operational backend | Java 25, Spring Boot 4.1 |
| Database service | MySQL 8.4 LTS |
| Frontend serving | Nginx 1.30 on Alpine |
| Local orchestration | Docker Compose |
