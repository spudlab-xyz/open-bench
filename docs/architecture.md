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

The workspace also contains an append-only version ledger. Projects, experiment planning,
conditions, variables, methods, specimens, runs, measurements, analyses, notes, attachment metadata,
and other persisted records receive an initial version and immutable snapshots for subsequent
changes or deletion tombstones. User changes require a reason; deterministic application actions
record a specific system reason. The active records remain separate from this audit history so a
deleted item does not silently reappear in operational views.

Stored date-times are ISO instants with an explicit offset or `Z`. The interface renders them with
both UTC offset and the browser's IANA time zone. Elapsed measurement time is stored in minutes and
variable definitions carry an explicit unit; `dimensionless` is a deliberate unit value rather than
an omitted one.

Workspace schema v3 adds experiment-owned scientific records for observation sources and permission
review, instruments, calibration, retained imports, explicit missing observations, validation
evidence, scientific review, conclusion evidence, and report releases. Existing records migrate
with `legacy-unknown` acquisition context and unvalidated method status rather than fabricated
provenance. Derived analyses retain a reproducibility manifest and are stale when their source data
revision differs from the current experiment.

Workspace schema v4 separates immutable procedure revisions from independently versioned method-
validation assessments. Assessments target explicit method revision IDs and retain a normalized
procedure fingerprint, decision, reviewer, evidence, intended use, limitations, timing, rationale,
and retrospective status. Validation may cover multiple revisions only after explicit selection and
only when their procedure fingerprints match. Legacy embedded validation migrates to an assessment
for that exact revision; it is never silently propagated to an earlier revision. Run method links
become immutable once measurements exist.

The complete browser archive is a JSON envelope containing the full workspace and append-only
ledger plus base64 attachment bytes with SHA-256 hashes. Its manifest reports integrity issues and
omissions before transfer. This is a prototype backup/exchange concept, not a server-side retention
or records-management guarantee.

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
