import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("app", () => {
  it("GET /health returns ok status", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("sets baseline security headers", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
    // Deployment is plain HTTP on the LAN — these must be absent.
    expect(res.headers["strict-transport-security"]).toBeUndefined();
    expect(res.headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
  });

  it("allows Fry's product images from Kroger's image host and nowhere else", async () => {
    const res = await request(createApp()).get("/health");
    const imgSrc = (res.headers["content-security-policy"] as string)
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("img-src"));
    expect(imgSrc).toBe("img-src 'self' data: https://www.kroger.com");
  });

  it("returns a JSON 404 for an unknown /api route", async () => {
    const res = await request(createApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("rejects an oversized JSON body", async () => {
    const big = { blob: "x".repeat(1_200_000) };
    const res = await request(createApp()).post("/api/recipes").send(big);
    expect(res.status).toBe(413);
  });
});
