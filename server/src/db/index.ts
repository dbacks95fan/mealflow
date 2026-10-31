// ABOUTME: Opens the SQLite database via the node:sqlite builtin, runs
// ABOUTME: pending migrations, and exports the handle.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { config } from "../config.js";
import { runMigrations } from "./migrate.js";

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncType;
};

const dbPath = config.sqlitePath;
if (dbPath !== ":memory:") {
  mkdirSync(dirname(dbPath), { recursive: true });
}

export const db = new DatabaseSync(dbPath);
if (dbPath !== ":memory:") {
  db.exec("PRAGMA journal_mode = WAL");
}
db.exec("PRAGMA foreign_keys = ON");

runMigrations(db);
