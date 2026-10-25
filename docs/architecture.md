# Architecture

## Current deployment

OpenBench starts as three containers on a private Compose network:

- **Frontend** — Nginx serves a React/TypeScript/Vite exploratory prototype on internal port `8080`.
  It is the only service published to the host, bound to `127.0.0.1` by default.
- **Backend** — one Spring Boot application provides HTTP infrastructure, JDBC connectivity,
  and an Actuator health endpoint. It has no product API, entities, repositories, schema, or
  migration tooling.
- **Database** — MySQL 8.4 LTS stores data in a named volume and creates a dedicated, non-root
  application user. It is reachable only on the private Compose network.

The services start in dependency order: MySQL must pass an authenticated query, then the backend
must report healthy with its database check, and finally Nginx starts and verifies static serving.

## Same-origin operations path

The browser-facing origin is Nginx. Its exact `/api/health` location proxies to the backend's
internal `/actuator/health` endpoint. Other `/api/` paths return `404`, and the backend port is not
published. Actuator exposes only health, with component and detail disclosure disabled.

This arrangement gives the deployment a real end-to-end operational check without pretending that
a business API exists. Product records are currently stored in IndexedDB through a small repository
interface. Attachment metadata lives with experiment records and attachment bytes use a separate
IndexedDB object store. That interface is the future replacement boundary for an API.

## Backend direction

The backend begins as one application in one Maven module because there are no domain boundaries
worth encoding yet. When product features are authorised, cohesive feature packages can be added
inside this modular monolith, with dependencies kept explicit. Additional Maven modules should be
introduced only when concrete build or ownership boundaries justify them.

Application tables and migration tooling belong with the first server-side persistence requirement.
Likewise, file storage should be introduced behind a domain-owned interface only when imports,
reports, or attachments define retention, integrity, and deployment needs. No object store is
assumed by this scaffold.

## Open decisions

React is selected for this exploratory prototype, not yet as an irreversible production decision.
Hosting, licensing, and pricing remain undecided; this repository intentionally makes no commitment
on those topics.
