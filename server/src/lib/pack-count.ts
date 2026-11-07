// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Suggests how many Fry's packs to buy from a grocery line's combined
// ABOUTME: amount and a product's free-text size (INT-MF-0004). It converts only
// ABOUTME: within weight, volume, or count, always rounds up, and otherwise
// ABOUTME: sends the item to manual review with a reason instead of guessing.
import { convertWithinFamily, normalizeUnit, unitFamily, type Quantity } from "./units.js";

export type PackFit =
  | {
      status: "suggested";
      packs: number;
      /** The recipe amount in the pack's unit, e.g. "3.5 lb". */
      needed: string;
      /** One pack's size, e.g. "3 lb". */
      perPack: string;
    }
  | { status: "manual"; reason: string };

type Family = "mass" | "volume" | "count";

interface Amount {
  amount: number;
  /** Canonical unit, or null for a plain count. */
  unit: string | null;
}

// Pack-size words that mean "this many items".
const COUNT_UNITS = new Set(["ct", "count", "each", "ea", "pc", "pcs", "piece", "pieces"]);

function familyOf(unit: string | null): Family | null {
  if (unit === null || COUNT_UNITS.has(unit)) return "count";
  const family = unitFamily(unit);
  return family;
}

const FAMILY_NOUN: Record<Family, string> = { mass: "weight", volume: "volume", count: "a count" };

function parseNumber(raw: string): number | null {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const NUMBER = String.raw`(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)`;
const SIZE = new RegExp(String.raw`^${NUMBER}\s*([a-z][a-z. ]*?)\.?$`);
const MULTIPACK = new RegExp(String.raw`^(\d+)\s*(?:x|×)\s*${NUMBER}\s*([a-z][a-z. ]*?)\.?$`);

/**
 * Read a Kroger size string such as "3 lb", "12 fl oz", "1/2 gal", "6 ct", or
 * "2 x 8 oz". Returns null for anything else, which the caller treats as a
 * size that can't be read.
 */
export function parseProductSize(size: string | null | undefined): Amount | null {
  if (!size) return null;
  const text = size.trim().toLowerCase().replace(/\s+/g, " ");

  let count = 1;
  let amountText: string;
  let unitText: string;
  const multi = text.match(MULTIPACK);
  const single = text.match(SIZE);
  if (multi) {
    count = Number(multi[1]);
    amountText = multi[2];
    unitText = multi[3];
  } else if (single) {
    amountText = single[1];
    unitText = single[2];
  } else {
    return null;
  }

  const amount = parseNumber(amountText);
  if (amount == null || amount <= 0 || count <= 0) return null;
  // A unit outside weight, volume, and count (a bulb, a bunch) is still read,
  // so the reason can name it; it only matches the same unit in a recipe.
  const unit = COUNT_UNITS.has(unitText) ? null : normalizeUnit(unitText);
  return { amount: amount * count, unit };
}

function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function formatAmount({ amount, unit }: Amount): string {
  return unit ? `${formatNumber(amount)} ${unit}` : formatNumber(amount);
}

function describeNeed(quantities: Quantity[]): string {
  return quantities
    .map((q) => [q.quantity != null ? formatNumber(q.quantity) : null, q.unit].filter(Boolean).join(" "))
    .join(" + ");
}

function manual(need: string, pack: string | null, why: string): PackFit {
  const first = pack ? `Recipe needs ${need}, pack is ${pack}.` : `Recipe needs ${need}.`;
  return { status: "manual", reason: `${first} ${why} Set the quantity yourself.` };
}

/**
 * Suggest a pack count for one product. `quantities` are the grocery line's
 * combined amounts (one entry per group of units that couldn't be combined).
 */
export function suggestPacks(quantities: Quantity[], productSize: string | null | undefined): PackFit {
  const need = describeNeed(quantities) || "an unspecified amount";

  if (quantities.length === 0 || quantities.some((q) => q.quantity == null || q.quantity <= 0)) {
    return manual(need, productSize?.trim() || null, "The recipe doesn't give an amount to work from.");
  }

  const pack = parseProductSize(productSize);
  if (!pack) {
    return productSize?.trim()
      ? manual(need, null, `Can't read the pack size "${productSize.trim()}".`)
      : manual(need, null, "Fry’s doesn’t list a pack size.");
  }
  const packFamily = familyOf(pack.unit);
  const packText = formatAmount(pack);

  let total = 0;
  for (const q of quantities) {
    const unit = normalizeUnit(q.unit);
    const family = familyOf(unit);
    if (unit !== null && unit === pack.unit && family === null) {
      // Same named unit on both sides ("2 bunch" against "1 bunch").
      total += q.quantity!;
    } else if (family === null || packFamily === null) {
      return manual(need, packText, `Can't convert ${unit ?? "a count"} to ${pack.unit ?? "a count"} automatically.`);
    } else if (family !== packFamily) {
      return manual(need, packText, `Can't convert ${FAMILY_NOUN[family]} to ${FAMILY_NOUN[packFamily]} automatically.`);
    } else if (family === "count") {
      total += q.quantity!;
    } else {
      total += convertWithinFamily(q.quantity!, unit!, pack.unit!)!;
    }
  }

  // Round the ratio first so float noise (48 oz / 3 lb = 3.0000000001) can't
  // add a pack, then always round up to a whole pack.
  const ratio = Math.round((total / pack.amount) * 1e6) / 1e6;
  return {
    status: "suggested",
    packs: Math.max(1, Math.ceil(ratio)),
    needed: formatAmount({ amount: total, unit: pack.unit }),
    perPack: packText,
  };
}
