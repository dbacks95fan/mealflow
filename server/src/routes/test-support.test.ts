// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: The e2e reset endpoint also clears the API rate-limit counters, so a
// ABOUTME: long test run doesn't exhaust the household's allowance.
import express from "express";
import { MemoryStore, rateLimit } from "express-rate-limit";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestSupportRouter } from "./test-support.js";

function appWithLimit(limit: number) {
  const store = new MemoryStore();
  const app = express();
  app.use("/api", rateLimit({ windowMs: 60_000, limit, store, standardHeaders: true, legacyHeaders: false }));
  app.use(createTestSupportRouter(store));
  app.get("/api/ping", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("test support reset", () => {
  it("clears the rate-limit counters along with the data", async () => {
    const app = appWithLimit(3);
    expect((await request(app).get("/api/ping")).status).toBe(200);
    expect((await request(app).get("/api/ping")).status).toBe(200);

    // The reset itself is the third request in the window, then the counter starts over.
    expect((await request(app).post("/api/test/reset")).status).toBe(204);
    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).get("/api/ping")).status).toBe(200);
    }
  });

  it("leaves the limit itself in force", async () => {
    const app = appWithLimit(2);
    expect((await request(app).post("/api/test/reset")).status).toBe(204);
    expect((await request(app).get("/api/ping")).status).toBe(200);
    expect((await request(app).get("/api/ping")).status).toBe(200);
    expect((await request(app).get("/api/ping")).status).toBe(429);
  });
});
