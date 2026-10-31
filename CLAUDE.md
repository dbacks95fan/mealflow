# CLAUDE.md

Persistent context for any agent (human-directed or autonomous Coding Agent)
working in this repository. Keep this concise — it is a map to `docs/`, not a
replacement for it.

## What this is

MealFlow: a household meal-planning app. Manage recipes,
select meals, calculate needed ingredients, and eventually integrate with
Fry's/Kroger shopping. See `docs/product/overview.md` for the product picture and
`docs/architecture/overview.md` for how it's built.

## Non-negotiable constraints (do not change without escalation)

- **No application authentication.** This runs on a trusted home LAN only.
- **SQLite** (`node:sqlite`, no native module) is the persistence layer. See
  `docs/decisions/0001-sqlite-over-postgres.md` for why.
- **Single Docker container** serves both the API and the built client on one
  configurable port (`PORT`, default 4000) — not separate frontend/backend
  containers. Data lives at `SQLITE_PATH` on a mounted volume.
- **Deployment target is a Synology DiskStation** on the home network — no cloud
  hosting assumptions.
- Must work on desktop and mobile browsers.

## Structure

```
client/   React + Vite + TypeScript SPA
server/   Express + TypeScript API, serves client/dist + /api/* + /health
e2e/      Playwright end-to-end tests (run against the built server, port 4000)
docs/     product/ architecture/ decisions/ plans/
```

## Commands

```
npm install
npm run dev:server        # API on :4000
npm run dev:client        # Vite dev server on :5173, proxies /api and /health
npm run build              # builds client, then server
npm run test:server        # vitest — server unit tests
npm run test:e2e           # Playwright — builds client+server, runs the real server, tests it
docker compose up -d --build
```

## Patterns to follow

- Server routes: one file per resource under `server/src/routes/`, mounted in
  `server/src/app.ts`. Each route file owns its own `*.test.ts` alongside it.
- Client pages: one file per route under `client/src/pages/`, wired in
  `client/src/App.tsx` via `react-router-dom`. Shared API calls live in
  `client/src/lib/api.ts` — don't call `fetch` directly from a page.
- New tables/migrations: extend the `CREATE TABLE IF NOT EXISTS` block in
  `server/src/db/index.ts`. There is no separate migration runner yet.
- New Playwright specs go in `e2e/tests/`, one file per user-facing flow.

## For the Coding Agent specifically

You are operating under an approved Work Contract, not a free-form request. See
the repository's Agentic SDLC tooling (`coding-agent` — a sibling project, not
inside this repo) for the rules you operate under. In short: implement exactly
the contract, add tests for what you change, run `npm run build`,
`npm run test:server`, and `npm run test:e2e` yourself before reporting, and if
the contract conflicts with something in this file or in `docs/architecture/`,
stop and escalate rather than silently picking a side.
