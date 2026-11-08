// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Shapes one grocery line's Fry's match for the review screen: every
// ABOUTME: product option carries its own pack-count fit, and the line's needed
// ABOUTME: quantity starts at the chosen product's suggestion (or 1 for review).
import type { KrogerProduct } from "./kroger-client.js";
import { suggestPacks, type PackFit } from "./pack-count.js";
import type { Quantity } from "./units.js";

export type FittedProduct = KrogerProduct & { fit: PackFit };

export interface FrysMatchLine {
  normalizedName: string;
  name: string;
  quantities: Quantity[];
  /** Starting quantity: the suggested packs, or 1 when the item needs manual review. */
  neededQuantity: number;
  remembered: boolean;
  chosen: FittedProduct | null;
  options: FittedProduct[];
  unmatched: boolean;
}

export function startingQuantity(fit: PackFit): number {
  return fit.status === "suggested" ? fit.packs : 1;
}

export function buildMatchLine(
  line: { normalizedName: string; name: string; quantities: Quantity[] },
  options: KrogerProduct[],
  chosen: KrogerProduct | null,
  remembered: boolean,
): FrysMatchLine {
  const fitted = options.map((product) => ({ ...product, fit: suggestPacks(line.quantities, product.size) }));
  const chosenFitted = chosen ? (fitted.find((o) => o.productId === chosen.productId) ?? null) : null;
  return {
    normalizedName: line.normalizedName,
    name: line.name,
    quantities: line.quantities,
    neededQuantity: chosenFitted ? startingQuantity(chosenFitted.fit) : 1,
    remembered,
    chosen: chosenFitted,
    options: fitted,
    unmatched: chosenFitted == null,
  };
}
