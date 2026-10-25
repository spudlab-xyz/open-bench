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

The prototype seeds three deterministic experiments on first use. Changes persist in IndexedDB in
the current browser. Use **Settings → Reset demo workspace** to restore the original demo records.

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
