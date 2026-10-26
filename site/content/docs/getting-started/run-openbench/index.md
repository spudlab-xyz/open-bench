---
title: Run OpenBench
description: Start and verify the local container stack.
weight: 10
---

## Prerequisites

Install Docker Engine with Docker Compose v2 (or a compatible current Compose plugin). Java, Maven,
Node.js, and MySQL do not need to be installed on the host for this route.

## 1. Prepare local configuration

From the repository root, copy the example environment file:

```sh
cp .env.example .env
```

Replace **both** `REPLACE_WITH_*` values with different, strong random passwords. Never commit the
resulting `.env` file.

## 2. Build and start

```sh
docker compose up --build --detach --wait
```

Open [http://localhost:8080](http://localhost:8080). If you changed `OPENBENCH_PORT`, use that port
instead.

## 3. Verify the operational path

```sh
curl --fail --silent http://localhost:8080/api/health
```

A healthy response reports a status of `UP`. Nginx proxies this exact path to the backend; other
`/api/` paths are not product APIs and return `404`.

## Explore the seeded workspace

The prototype creates four deterministic experiments on first use. Browse their projects,
specimens, method revisions, runs, measurements, analyses, and reports, or create a separate
experiment. Changes persist in IndexedDB for this browser and origin.

Continue with the illustrated [Guided journeys](../../using-openbench/guided-journeys/) or look up a
form in the [Field reference](../../using-openbench/field-reference/).

Before choosing a long-term browser profile, read the
[browser and accessibility guidance](../../using-openbench/task-guides/browser-and-accessibility/)
and [data storage and safety](../../using-openbench/data-safety/) pages.

## Stop the stack

```sh
docker compose down
```

This preserves the Compose-managed MySQL volume. Avoid `docker compose down --volumes` unless you
intentionally want to delete that volume.
