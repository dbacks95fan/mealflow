# Architecture Overview

## Stack

- **Client**: React 19 + Vite + TypeScript, `react-router-dom` for routing.
- **Server**: Express + TypeScript, serves both the JSON API (`/api/*`, `/health`)
  and the built client (`client/dist`) from one process on one port.
- **Persistence**: SQLite via Node's built-in `node:sqlite` (no native module —
  chosen specifically to avoid native-compile friction on both a dev Windows
  machine and an ARM/x86 Synology NAS). See `docs/decisions/0001-sqlite-over-postgres.md`.
- **Tests**: Vitest for server unit tests; Playwright for end-to-end tests, run
  against the real built server (not the Vite dev server) so what's tested
  matches what's deployed.
- **Deployment**: single Docker image (multi-stage build), `docker-compose.yml`
  with a configurable `HTTP_PORT` and a bind-mounted `./data` volume for the
  SQLite file. Target: a Synology DiskStation on the home LAN, reached by its LAN
  IP — no reverse proxy, no TLS, no auth.

## Why one container, not client+server+db as separate services

This is a single-household, no-auth, home-NAS app. Running a separate database
container (Postgres) or a separate frontend container adds real operational
weight (more containers to keep healthy on a resource-constrained NAS) for no
benefit at this scale. The Express server serving the built SPA plus API is the
whole runtime; SQLite is a file on the same mounted volume.

## Request flow

```
Browser --> :PORT (Express)
              |-- /health           -> liveness
              |-- /api/recipes      -> server/src/routes/recipes.ts
              |-- /api/preferences  -> server/src/routes/preferences.ts
              '-- everything else   -> client/dist/index.html (SPA fallback)
```

## Data model (current)

```
recipes(id, name, ingredients JSON-encoded-array, created_at)
preferences(key, value, updated_at)
```

Schema changes are ordered SQL files under `server/src/db/migrations/`
(`NNN_name.sql`), applied once each by `runMigrations()` in
`server/src/db/migrate.ts` and tracked in a `schema_migrations` table. The build
copies the `.sql` files into `dist/` (`server/scripts/copy-migrations.mjs`). Add
a new numbered file; never edit an applied one.

## Cross-cutting server middleware

`server/src/app.ts` wires, in order: `helmet` (security headers, CSP), optional
CORS (`CORS_ORIGINS`), `express.json` with a 1 MB limit, `pino-http` request
logging, and `express-rate-limit` on `/api`. Unmatched `/api` paths get a JSON
404; a terminal error handler returns safe error bodies. Env is parsed and
validated once in `server/src/config.ts` (zod). See `SECURITY.md`.

## Known constraints future work must respect

- No authentication, by design (see `CLAUDE.md`).
- Single configurable port, one process.
- Must run on both a Windows dev machine and a Synology DiskStation (older
  Avoton-class hardware in the current deployment) without native compilation.
