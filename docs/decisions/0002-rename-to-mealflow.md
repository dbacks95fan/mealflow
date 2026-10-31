# 0002 — Rename the product to MealFlow

**Status**: Accepted

## Context

The product was scaffolded under a working name. The durable product name is
**MealFlow** (see `docs/product/overview.md`), and the working name still appeared in
user-facing UI, package metadata, the default database filename, container/image
names, the GitHub repository, tests, and docs. Trello card **INT-MF-0001** captures the
rename.

## Decision

- Every product-identifying string is **MealFlow** / `mealflow`: the client `<title>`
  and `<h1>`, npm package names (`mealflow`, `mealflow-server`, `mealflow-e2e`), the
  server startup log line, `docker-compose.yml` project/image/container names, e2e
  assertions, docs, the default SQLite filename (`mealflow.db`), the GitHub repository
  (`dbacks95fan/mealflow`), and the local checkout directory.
- The working name is retired entirely rather than kept as a "formerly called" note.

## Persistence migration

Existing household data was carried over by a one-off startup shim that renamed the
old database file (and its `-wal` / `-shm` / `-journal` sidecars) to `mealflow.db`.
The shim was removed once the only deployment, the Synology NAS, had started on the
new filename.

## Consequences

- Nothing in the repository refers to the working name.
- A deployment that still holds a database under the old filename will start with an
  empty `mealflow.db`; rename the file while the container is stopped.
