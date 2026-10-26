---
title: Architecture
description: Understand current service boundaries and the future persistence seam.
weight: 10
---

## Runtime services

OpenBench starts three containers on a private Compose network:

1. **Frontend** — Nginx serves the React/Vite build on internal port `8080`. It is the only service
   published to the host and is bound to `127.0.0.1` by default.
2. **Backend** — a Spring Boot application provides HTTP infrastructure, JDBC connectivity, and an
   Actuator health endpoint. Its port is not published.
3. **Database** — MySQL 8.4 uses a named volume and a dedicated non-root application user. It is
   reachable only from the private network.

Startup follows health dependencies: MySQL must answer an authenticated query, the backend must
report healthy with its database check, and then Nginx starts and verifies static serving.

## Same-origin operational endpoint

Nginx proxies exactly `/api/health` to the backend's `/actuator/health`. Health details and component
information are hidden. Other `/api/` paths return `404`; there is no product API yet.

## Product-data boundary

The frontend accesses IndexedDB through a small repository interface. Experiment records and
attachment metadata live in the workspace record, while attachment bytes use a separate object
store. That interface is the intended replacement boundary for a future server API.

The backend remains one Maven module because no proven product-domain boundaries require more.
Application tables, migration tooling, and file storage should arrive with concrete persistence and
retention requirements rather than in advance of them.
