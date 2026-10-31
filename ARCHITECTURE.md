# MealFlow Architecture

This is the product-level architecture entry point. It summarizes the current system and links to the detailed [architecture overview](docs/architecture/overview.md) and [architecture decision records](docs/decisions/). The [constitution](CONSTITUTION.md) contains durable product and engineering constraints; this file describes the current technical shape. Keep this summary aligned with the implementation as it evolves.

## Current system

- **Users and hosting:** one household uses MealFlow from desktop or mobile browsers on its trusted home network. The deployment target is a Synology DiskStation; public internet hosting is not assumed.
- **Client:** a React 19, Vite, and TypeScript single-page app. The built client is served by the application server.
- **Server:** a TypeScript Express process serves the built client, JSON API routes under `/api/*`, and `/health` on one configurable port.
- **Persistence:** SQLite through Node's built-in `node:sqlite`. The database file resides on a persistent mounted volume. Numbered SQL migrations are applied once and tracked in `schema_migrations`.
- **Deployment:** one multi-stage Docker image and one container, configured with Docker Compose. The container runs as the non-root `node` user.
- **External shopping integration:** optional Fry's/Kroger API access supports product search and adding items to the household cart. OAuth refresh tokens are encrypted at rest; checkout remains with Kroger.
- **Validation:** Vitest server tests and Playwright end-to-end tests against the built server; GitHub Actions builds and runs the test suites.

## Runtime shape

```text
Desktop/mobile browser
        |
        v
Single Express process and container
  |-- /health
  |-- /api/* routes --------> SQLite file on persistent volume
  '-- SPA fallback --------> built React client
        |
        '-- optional Fry's/Kroger API calls
```

## Architectural boundaries and constraints

- The browser communicates with the server through the shared API client; pages should not bypass it with direct `fetch` calls.
- Server routes are organized by resource, with route tests alongside them. Database changes use new numbered migration files; do not edit migrations already applied to user data.
- The app intentionally has no general authentication, TLS termination, or reverse proxy in its current home-LAN deployment model. Any change to exposure or user population requires an explicit security and architecture decision first.
- Preserve compatibility with the Windows development environment and the current Synology target. Avoid native dependencies unless the tradeoff is explicitly reviewed.
- The current implementation and decision records are the source for confirmed technical facts; feature specs must verify repository state rather than assume this summary is exhaustive.

## Decision history

- [SQLite over Postgres](docs/decisions/0001-sqlite-over-postgres.md)
- [Rename the product to MealFlow](docs/decisions/0002-rename-to-mealflow.md)
- [Fry's / Kroger cart integration](docs/decisions/0003-frys-kroger-cart-integration.md)

For component details and request flow, see [docs/architecture/overview.md](docs/architecture/overview.md). For product rules, see [CONSTITUTION.md](CONSTITUTION.md).
