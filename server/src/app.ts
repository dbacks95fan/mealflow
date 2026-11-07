// ABOUTME: Builds the Express app — security middleware, JSON API routers, and
// ABOUTME: the built SPA with a history-fallback for client-side routing.
import cors from "cors";
import { MemoryStore, rateLimit } from "express-rate-limit";
import express from "express";
import helmet from "helmet";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { groceryListRouter } from "./routes/grocery-list.js";
import { healthRouter } from "./routes/health.js";
import { importRouter } from "./routes/import.js";
import { krogerRouter } from "./routes/kroger.js";
import { householdRouter } from "./routes/household.js";
import { pantryRouter } from "./routes/pantry.js";
import { preferencesRouter } from "./routes/preferences.js";
import { recipesRouter } from "./routes/recipes.js";
import { selectionsRouter } from "./routes/selections.js";
import { createTestSupportRouter, testSupportEnabled } from "./routes/test-support.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const clientDist = join(currentDir, "..", "..", "client", "dist");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Served over plain HTTP on the home LAN by design — do not tell
          // browsers to upgrade same-origin asset requests to HTTPS.
          "upgrade-insecure-requests": null,
          // Fry's product photos on the review screen come from Kroger's
          // image host (INT-MF-0005); nothing else may load cross-origin.
          "img-src": ["'self'", "data:", "https://www.kroger.com"],
        },
      },
      // No HTTPS in the deployment target; HSTS would be meaningless.
      hsts: false,
    }),
  );

  // Same-origin in production (one process serves API + SPA), so CORS stays off
  // unless CORS_ORIGINS is explicitly set for a split dev setup.
  if (config.corsOrigins.length > 0) {
    app.use(cors({ origin: config.corsOrigins }));
  }

  app.use(express.json({ limit: "1mb" }));

  if (!config.isTest) {
    app.use(pinoHttp({ logger }));
  }

  const rateLimitStore = new MemoryStore();
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600, // generous for a household; blocks runaway loops / abuse
      standardHeaders: true,
      legacyHeaders: false,
      store: rateLimitStore,
    }),
  );

  app.use(healthRouter);
  app.use(recipesRouter);
  app.use(preferencesRouter);
  app.use(householdRouter);
  app.use(selectionsRouter);
  app.use(pantryRouter);
  app.use(groceryListRouter);
  app.use(importRouter);
  app.use(krogerRouter);
  if (testSupportEnabled) {
    app.use(createTestSupportRouter(rateLimitStore));
  }

  app.use("/api", notFoundHandler);

  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api|\/health).*/, (_req, res) => {
      res.sendFile(join(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
