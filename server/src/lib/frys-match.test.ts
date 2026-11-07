// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: buildMatchLine — each option carries its own fit and the starting
// ABOUTME: quantity follows the chosen product (INT-MF-0004).
import { describe, expect, it } from "vitest";
import { buildMatchLine } from "./frys-match.js";
import type { KrogerProduct } from "./kroger-client.js";

const product = (id: string, size: string | null): KrogerProduct => ({
  productId: id,
  upc: `upc-${id}`,
  description: `Product ${id}`,
  brand: "Brand",
  size,
  price: 2.5,
  imageUrl: null,
});

const beef = { normalizedName: "ground beef", name: "ground beef", quantities: [{ quantity: 3.5, unit: "lb" }] };

describe("buildMatchLine", () => {
  it("starts the quantity at the chosen product's suggestion", () => {
    const options = [product("a", "3 lb"), product("b", "1 lb")];
    const line = buildMatchLine(beef, options, options[0], false);
    expect(line.neededQuantity).toBe(2);
    expect(line.chosen?.fit).toMatchObject({ status: "suggested", packs: 2 });
    expect(line.options.map((o) => o.fit)).toMatchObject([
      { status: "suggested", packs: 2 },
      { status: "suggested", packs: 4 },
    ]);
    expect(line.unmatched).toBe(false);
  });

  it("starts a manual review item at 1", () => {
    const cheese = { normalizedName: "cheese", name: "cheese", quantities: [{ quantity: 3, unit: "cup" }] };
    const options = [product("a", "8 oz")];
    const line = buildMatchLine(cheese, options, options[0], true);
    expect(line.neededQuantity).toBe(1);
    expect(line.chosen?.fit.status).toBe("manual");
    expect(line.remembered).toBe(true);
  });

  it("marks a line with no product unmatched", () => {
    const line = buildMatchLine(beef, [], null, false);
    expect(line).toMatchObject({ unmatched: true, chosen: null, neededQuantity: 1, options: [] });
  });
});
