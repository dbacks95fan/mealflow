// ABOUTME: /api/frys — connect a Fry's (Kroger) account, pick a store, match
// ABOUTME: grocery-list ingredients to products (remembering brand choices), and
// ABOUTME: push the matched items to the customer's cart. No checkout.
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { logger } from "../logger.js";
import {
  clearFrysTokens,
  connectWithCode,
  FrysNotConnectedError,
  getUserAccessToken,
  isFrysConnected,
} from "../lib/frys-account.js";
import { buildGroceryList, type GroceryInput } from "../lib/grocery-list.js";
import {
  addToCart,
  buildAuthorizeUrl,
  findLocations,
  getProductById,
  getProductToken,
  KrogerError,
  searchProducts,
  type KrogerProduct,
} from "../lib/kroger-client.js";

export const krogerRouter = Router();

// OAuth `state` values are short-lived and single-use; a restart mid-flow just
// means the user restarts the (few-second) connect flow.
const pendingStates = new Map<string, number>();
const STATE_TTL_MS = 10 * 60 * 1000;

function newState(): string {
  const state = randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

function consumeState(state: string): boolean {
  const expiry = pendingStates.get(state);
  pendingStates.delete(state);
  return expiry != null && expiry > Date.now();
}

interface HouseholdRow {
  frys_location_id: string | null;
  frys_location_name: string | null;
  kroger_connected_at: string | null;
}

function household(): HouseholdRow {
  return db
    .prepare(
      "SELECT frys_location_id, frys_location_name, kroger_connected_at FROM household WHERE id = 1",
    )
    .get() as unknown as HouseholdRow;
}

krogerRouter.get("/api/frys/status", (_req, res) => {
  const row = household();
  res.json({
    configured: config.kroger.configured,
    connected: isFrysConnected(),
    connectedAt: row.kroger_connected_at,
    locationId: row.frys_location_id,
    locationName: row.frys_location_name,
  });
});

krogerRouter.get("/api/frys/authorize-url", (_req, res) => {
  if (!config.kroger.configured) {
    res.status(409).json({ error: "Fry's integration is not configured on this server." });
    return;
  }
  res.json({ url: buildAuthorizeUrl(newState()) });
});

krogerRouter.get("/api/frys/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !consumeState(state)) {
    res.redirect("/settings?frys=error");
    return;
  }
  try {
    await connectWithCode(code);
    res.redirect("/settings?frys=connected");
  } catch (err) {
    // This request renders in the user's browser mid-OAuth. Any failure —
    // a Kroger error, or a network/DNS failure reaching Kroger — should land
    // them back on Settings with an error, never a raw 500.
    logger.error({ err }, "Fry's connect callback failed");
    res.redirect("/settings?frys=error");
  }
});

krogerRouter.post("/api/frys/disconnect", (_req, res) => {
  clearFrysTokens();
  res.status(204).end();
});

krogerRouter.get("/api/frys/locations", async (req, res, next) => {
  const zip = typeof req.query.zip === "string" ? req.query.zip.trim() : "";
  if (!/^\d{5}$/.test(zip)) {
    res.status(400).json({ error: "A 5-digit ZIP code is required." });
    return;
  }
  try {
    const locations = await findLocations(zip, await getProductToken());
    res.json(locations);
  } catch (err) {
    if (err instanceof KrogerError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const SetLocation = z.object({
  locationId: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

krogerRouter.put("/api/frys/location", (req, res) => {
  const parsed = SetLocation.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "locationId and name are required" });
    return;
  }
  db.prepare(
    "UPDATE household SET frys_location_id = ?, frys_location_name = ?, updated_at = datetime('now') WHERE id = 1",
  ).run(parsed.data.locationId, parsed.data.name);
  res.json({ locationId: parsed.data.locationId, locationName: parsed.data.name });
});

interface GroceryRow {
  recipe_id: number;
  recipe_name: string;
  name: string;
  quantity: number | null;
  unit: string | null;
}

interface MapRow {
  normalized_name: string;
  kroger_product_id: string;
  upc: string | null;
  brand: string | null;
  size: string | null;
  description: string | null;
}

function groceryLinesForMatching() {
  const rows = db
    .prepare(
      `SELECT s.recipe_id, r.name AS recipe_name, i.name, i.quantity, i.unit
       FROM meal_selections s
       JOIN recipes r ON r.id = s.recipe_id
       JOIN ingredients i ON i.recipe_id = s.recipe_id
       ORDER BY i.position, i.id`,
    )
    .all() as unknown as GroceryRow[];
  const inputs: GroceryInput[] = rows.map((row) => ({
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
  }));
  const pantry = new Set(
    (db.prepare("SELECT normalized_name FROM pantry_items").all() as { normalized_name: string }[]).map(
      (p) => p.normalized_name,
    ),
  );
  return buildGroceryList(inputs).filter((line) => !pantry.has(line.normalizedName));
}

krogerRouter.get("/api/frys/match", async (_req, res, next) => {
  const row = household();
  if (!isFrysConnected()) {
    res.status(409).json({ error: "Connect a Fry's account first." });
    return;
  }
  if (!row.frys_location_id) {
    res.status(409).json({ error: "Choose a Fry's store first." });
    return;
  }

  try {
    // Product search / lookup uses the app's client-credentials token
    // (product.compact scope) — NOT the user's cart token, which lacks it.
    const productToken = await getProductToken();
    const locationId = row.frys_location_id;
    const maps = new Map(
      (db.prepare("SELECT * FROM ingredient_product_map").all() as unknown as MapRow[]).map((m) => [
        m.normalized_name,
        m,
      ]),
    );

    const lines = [];
    for (const line of groceryLinesForMatching()) {
      const saved = maps.get(line.normalizedName);
      let chosen: KrogerProduct | null = null;
      let options: KrogerProduct[] = [];

      if (saved) {
        chosen =
          (await getProductById(saved.kroger_product_id, locationId, productToken).catch((err) => {
            logger.warn({ err, productId: saved.kroger_product_id }, "Fry's product lookup failed");
            return null;
          })) ??
          {
            productId: saved.kroger_product_id,
            upc: saved.upc ?? saved.kroger_product_id,
            description: saved.description ?? "Saved product",
            brand: saved.brand,
            size: saved.size,
            price: null,
            imageUrl: null,
          };
        options = [chosen];
      } else {
        options = await searchProducts(line.name, locationId, productToken).catch((err) => {
          logger.warn({ err, term: line.name }, "Fry's product search failed");
          return [];
        });
        chosen = options[0] ?? null;
      }

      lines.push({
        normalizedName: line.normalizedName,
        name: line.name,
        quantities: line.quantities,
        neededQuantity: 1,
        remembered: Boolean(saved),
        chosen,
        options,
        unmatched: chosen == null,
      });
    }

    const total = lines.reduce(
      (sum, line) => sum + (line.chosen?.price != null ? line.chosen.price * line.neededQuantity : 0),
      0,
    );

    res.json({ currency: "USD", total: Math.round(total * 100) / 100, lines });
  } catch (err) {
    if (err instanceof FrysNotConnectedError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof KrogerError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const SaveMatch = z.object({
  productId: z.string().trim().min(1),
  upc: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).nullable().optional(),
  size: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).optional(),
});

krogerRouter.put("/api/frys/match/:normalizedName", (req, res) => {
  const parsed = SaveMatch.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "productId is required" });
    return;
  }
  const { productId, upc, brand, size, description } = parsed.data;
  db.prepare(
    `INSERT INTO ingredient_product_map (normalized_name, kroger_product_id, upc, brand, size, description, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(normalized_name) DO UPDATE SET
       kroger_product_id = excluded.kroger_product_id,
       upc = excluded.upc,
       brand = excluded.brand,
       size = excluded.size,
       description = excluded.description,
       updated_at = excluded.updated_at`,
  ).run(req.params.normalizedName, productId, upc ?? null, brand ?? null, size ?? null, description ?? null);
  res.json({ ok: true });
});

const CartBody = z.object({
  items: z
    .array(
      z.object({
        upc: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        name: z.string().trim().min(1),
      }),
    )
    .min(1),
});

krogerRouter.post("/api/frys/cart", async (req, res, next) => {
  const parsed = CartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "items (upc, quantity, name) are required" });
    return;
  }
  if (!isFrysConnected()) {
    res.status(409).json({ error: "Connect a Fry's account first." });
    return;
  }

  try {
    const token = await getUserAccessToken();
    const added: string[] = [];
    const failed: { name: string; reason: string }[] = [];

    // One request per item so a single bad UPC does not sink the whole cart.
    for (const item of parsed.data.items) {
      try {
        await addToCart([{ upc: item.upc, quantity: item.quantity }], token);
        added.push(item.name);
      } catch (err) {
        failed.push({
          name: item.name,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Always 200 — the submission itself was processed. `allSucceeded` / `failed`
    // carry the per-item outcome so the client never claims false success.
    res.json({ added, failed, allSucceeded: failed.length === 0 });
  } catch (err) {
    if (err instanceof FrysNotConnectedError) {
      res.status(409).json({ error: err.message });
      return;
    }
    next(err);
  }
});
