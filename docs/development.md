# Development

## Frontend prototype

The frontend requires Node.js 24 and uses the committed npm lockfile:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite serves browser-local prototype data and does not require the
backend. Run focused tests and the production build with:

```sh
npm test
npm run typecheck
npm run build
```

Prototype records are kept in IndexedDB for the current origin. Vite and the Docker-hosted frontend
therefore use separate browser workspaces. Export an experiment as JSON when moving between origins;
plain JSON includes attachment metadata but not attachment bytes.

Experiment JSON exports contain the current experiment snapshot, not the workspace-wide version
ledger. When changing persistence code, preserve version snapshots and deletion tombstones, require
explicit units, and reject imported date-times that do not carry a UTC offset or `Z` suffix.

## Backend

The backend requires Java 25. Use the committed Maven Wrapper so every environment uses Maven
3.10.0:

```sh
cd backend
./mvnw verify
```

No global Maven installation is required. On Windows, use `mvnw.cmd verify`.

### Run against local MySQL

The main Compose stack intentionally does not publish MySQL. For backend-only development, start a
separate localhost-bound MySQL container with development-only credentials:

```sh
docker run --detach --name openbench-dev-mysql \
  --publish 127.0.0.1:3306:3306 \
  --env MYSQL_DATABASE=openbench \
  --env MYSQL_USER=openbench \
  --env MYSQL_PASSWORD=choose-a-development-password \
  --env MYSQL_ROOT_PASSWORD=choose-a-different-root-password \
  --volume openbench-dev-mysql:/var/lib/mysql \
  mysql:8.4.11
```

Then provide configuration in the shell rather than source control:

```sh
cd backend
export DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=openbench DB_USER=openbench
export DB_PASSWORD=choose-a-development-password
./mvnw spring-boot:run
```

Check `http://localhost:8080/actuator/health`. Stop the development database with
`docker stop openbench-dev-mysql`; restart it later with `docker start openbench-dev-mysql`.

Never add local passwords to `application.yaml`, tests, scripts, or committed environment files.
The tracked application configuration contains variable references only.

## Validate the complete stack

From the repository root, after preparing `.env` as described in the README:

```sh
docker compose config --quiet
docker compose build
docker compose up --detach --wait --wait-timeout 180
curl --fail http://localhost:8080/
curl --fail --silent http://localhost:8080/api/health
docker compose ps
```

The health response must report `UP`. Use `docker compose logs` for diagnostics and
`docker compose down` when finished; the latter preserves database data.
