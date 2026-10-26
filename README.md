# OpenBench

**Plan experiments. Capture measurements. Understand results.**

OpenBench by SpudLab is a planned single-user scientific experiment tracker and analyser.
This repository currently contains an **interactive frontend prototype** for exploring product
workflows. Experiment records and attachments are stored only in the browser; the backend remains
an operational scaffold and does not provide product APIs or persistence.

## Stack

| Component | Selected version | Role |
|---|---:|---|
| Java | 25 LTS (Temurin 25.0.4.1+1 images) | Backend runtime |
| Spring Boot | 4.1.2 | HTTP, JDBC, and operational health |
| Maven | 3.10.0 via Wrapper 3.3.4 | Backend build |
| MySQL | 8.4.11 LTS | Persistent database service |
| Nginx | 1.30.6 on Alpine 3.24 | Static frontend and health proxy |
| React / Vite | React 19.3.1 / Vite 8.3.5 | Browser-only interactive prototype |

Spring Boot's [system requirements](https://docs.spring.io/spring-boot/system-requirements.html)
confirm Java 25 compatibility. The container versions use explicit tags from the official
[Eclipse Temurin](https://hub.docker.com/_/eclipse-temurin),
[MySQL](https://hub.docker.com/_/mysql), and [Nginx](https://hub.docker.com/_/nginx) images.

## Prerequisites

- Docker Engine with Docker Compose v2 or a compatible current Compose plugin
- A shell for the commands below

Java and Maven are not required to run the container stack.

The prototype seeds four deterministic experiments on first use. Changes persist in IndexedDB in
the current browser. Use **Settings → Reset demo workspace** to restore the original demo records.

Every persisted record starts at version 1. An actual data change or deletion of an existing record
requires a reason and creates a timestamped version; submitting unchanged data does not create audit
noise. Deterministic operations such as completing a run record
their own system reason. Open **History** in the application navigation to inspect retained
snapshots, deleted-record tombstones, and field-by-field comparisons. The global page shows changed
records and non-initial audit events by default; enable **Include initial versions** when creation
snapshots or unchanged records are needed. Active record views also show
a **vN** chip: **Initial** means no later change exists, while a change count identifies available
revisions and opens an in-context audit dialog. Date-times always state their
UTC offset and browser IANA time zone, while numerical measurements always state their units.

The Procedure editor instead shows the current immutable procedure revision (for example, **v2 ·
Procedure revision**) because runs reference that domain revision directly. Its adjacent Revision
audit trail provides snapshots and comparisons; comparing the latest starts with previous → latest.

Existing procedure executions can be corrected from **Runs → Edit** or **Run detail → Edit run**.
Timing, status, specimen associations, cycle, and execution deviations are editable. The method
revision and measured specimens become locked once measurements exist, preserving which procedure
was actually used. Saving a real change
requires a reason and creates the next run version. Run names in the experiment overview's
**Recent runs** table open the corresponding execution detail directly.

Project dashboards keep general details and lifecycle status separate. Use **Edit project** for the
name, description, or colour; saving changed details requires a reason and creates a project version.
Use **Update lifecycle** for status, where a mandatory lifecycle note records why the status changed.

Experiments also carry a browser-local **Scientific record**. It captures intended use and limits,
source permissions and attribution, provider/station identifiers, instruments, calibration history,
validation evidence, and scientific reviews. Measurement records can distinguish raw, corrected,
derived, estimated, and forecast values; retain acquisition/source context, uncertainty, precision,
detection limits, quality rationale, and explicit missing-observation reasons. CSV imports retain
their SHA-256 file hash, mapping, raw rows, accepted rows, and rejected-row errors.

Procedure revisions and validation assessments have separate lifecycles. Changing validation never
creates or rewrites a procedure revision. An assessment targets exact method IDs and may explicitly
cover other revisions only when their normalized procedure fingerprints match. Retrospective
validation clears readiness for the recorded revision while remaining disclosed in reports.

Named analyses store their algorithm/build version, formula, aggregation rule, exact included
measurement IDs, exclusions, rounding policy, result snapshot, and checksum. Data changes mark
analyses and linked conclusions stale. Reviewed/released report records are blocked while readiness
issues remain. **Settings → Complete browser archive** exports the schema-v4 workspace, version
ledger, scientific metadata, raw import provenance, and available attachment bytes with hashes.
These features demonstrate transparent scientific-record concepts; they are not certification,
independent validation, or a substitute for a production laboratory records system.

## First run

1. Create the local environment file:

   ```sh
   cp .env.example .env
   ```

2. Edit `.env` and replace **both** `REPLACE_WITH_*` credential values with different,
   strong random passwords. Do not use the committed placeholder values and never commit `.env`.

3. Build and start the stack:

   ```sh
   docker compose up --build --detach --wait
   ```

4. Open [http://localhost:8080](http://localhost:8080). If `OPENBENCH_PORT` was changed in
   `.env`, use that port instead.

5. Verify the same-origin, database-backed health endpoint:

   ```sh
   curl --fail --silent http://localhost:8080/api/health
   ```

   A healthy response has a `status` of `UP` without exposing component details.

Compose rejects missing or empty required database settings with a specific variable error.

## Common commands

Follow logs:

```sh
docker compose logs --follow
```

Stop and remove containers while preserving the named MySQL data volume:

```sh
docker compose down
```

Rebuild after source changes:

```sh
docker compose up --build --detach --wait
```

> **Data deletion warning:** The following command permanently deletes the Compose-managed
> MySQL volume and all data stored in it:
>
> ```sh
> docker compose down --volumes
> ```

See [architecture](docs/architecture.md) for service boundaries and
[development](docs/development.md) for local backend workflows and validation.
