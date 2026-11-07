// ABOUTME: A data-reset endpoint for end-to-end tests. Only mounted when
// ABOUTME: MEALFLOW_ENABLE_TEST_RESET=1; never in a normal deployment.
import { Router } from "express";
import type { Store } from "express-rate-limit";
import { db } from "../db/index.js";

export const testSupportEnabled = process.env.MEALFLOW_ENABLE_TEST_RESET === "1";

/**
 * Each reset also clears the API rate-limit counters, so the end-to-end suite
 * starts every test with the household's normal allowance instead of sharing
 * one 15-minute window across the whole run. The limit itself is unchanged.
 */
export function createTestSupportRouter(rateLimitStore: Store): Router {
  const router = Router();

  router.post("/api/test/reset", async (_req, res) => {
    db.exec(`
      DELETE FROM meal_selections;
      DELETE FROM pantry_items;
      DELETE FROM ingredient_product_map;
      DELETE FROM ingredients;
      DELETE FROM recipes;
      UPDATE household
        SET name = 'Our Household', frys_location_id = NULL, frys_location_name = NULL,
            kroger_tokens_enc = NULL, kroger_connected_at = NULL
        WHERE id = 1;
    `);
    await rateLimitStore.resetAll?.();
    res.status(204).end();
  });

  return router;
}
