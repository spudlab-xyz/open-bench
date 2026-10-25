---
title: Local development and validation
description: Run focused frontend and backend workflows and validate the complete stack.
weight: 20
---

## Frontend prototype

The frontend requires Node.js 24 and uses the committed npm lockfile:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The Vite server uses browser-local data and does not require the
backend. Validate changes with:

```sh
npm test
npm run typecheck
npm run build
```

## Backend

The backend requires Java 25. Use the committed Maven Wrapper, which selects Maven 3.10.0:

```sh
cd backend
./mvnw verify
```

The backend needs a MySQL connection when run as an application. Keep local credentials in shell
environment variables; never add passwords to tracked configuration, tests, or scripts.

## Complete stack

After creating the root `.env` described in [Run OpenBench](../../getting-started/run-openbench/),
validate the deployment from the repository root:

```sh
docker compose config --quiet
docker compose build
docker compose up --detach --wait --wait-timeout 180
curl --fail http://localhost:8080/
curl --fail --silent http://localhost:8080/api/health
docker compose ps
docker compose down
```

Preserve the planned single-user scope, original scientific data, and the separation between
calculated findings and researcher conclusions. Avoid speculative infrastructure and dependencies.
