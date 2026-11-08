// ABOUTME: Cooking unit vocabulary — normalize aliases/plurals to canonical
// ABOUTME: units, decide when two units can be combined, and sum quantities
// ABOUTME: within a compatible group (converting across a measurement family).

export type UnitFamily = "volume" | "mass";

// Canonical unit -> multiplier to the family base (millilitre / gram).
const VOLUME_ML: Record<string, number> = {
  tsp: 4.928922,
  tbsp: 14.786765,
  "fl oz": 29.57353,
  cup: 236.5882,
  pint: 473.1765,
  quart: 946.353,
  gallon: 3785.412,
  ml: 1,
  l: 1000,
};

const MASS_G: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.34952,
  lb: 453.5924,
};

// Everything the parser and normalizer should recognise. Left side is compared
// lowercased with a trailing "." stripped.
const ALIASES: Record<string, string> = {
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp", tsp: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsps: "tbsp", tbsp: "tbsp", tbs: "tbsp",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz", "fl oz": "fl oz", floz: "fl oz",
  cup: "cup", cups: "cup",
  pint: "pint", pints: "pint", pt: "pint",
  quart: "quart", quarts: "quart", qt: "quart",
  gallon: "gallon", gallons: "gallon", gal: "gallon",
  milliliter: "ml", millilitre: "ml", milliliters: "ml", millilitres: "ml", ml: "ml",
  liter: "l", litre: "l", liters: "l", litres: "l", l: "l",
  milligram: "mg", milligrams: "mg", mg: "mg",
  gram: "g", grams: "g", g: "g",
  kilogram: "kg", kilograms: "kg", kg: "kg",
  ounce: "oz", ounces: "oz", oz: "oz",
  pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  clove: "clove", cloves: "clove",
  can: "can", cans: "can",
  package: "package", packages: "package", pkg: "package", pkgs: "package", packet: "package", packets: "package",
  bunch: "bunch", bunches: "bunch",
  head: "head", heads: "head",
  slice: "slice", slices: "slice",
  sprig: "sprig", sprigs: "sprig",
  stick: "stick", sticks: "stick",
  pinch: "pinch", pinches: "pinch",
  dash: "dash", dashes: "dash",
  piece: "piece", pieces: "piece",
};

export const KNOWN_UNITS: ReadonlySet<string> = new Set([
  ...Object.keys(ALIASES),
  ...Object.values(ALIASES),
]);

export function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!key) return null;
  return ALIASES[key] ?? key;
}

export function unitFamily(unit: string | null): UnitFamily | null {
  if (!unit) return null;
  if (unit in VOLUME_ML) return "volume";
  if (unit in MASS_G) return "mass";
  return null;
}

/**
 * Convert an amount between two units of the same measurement family. Returns
 * null when either unit has no family or the families differ — callers decide
 * what an unconvertible pair means, rather than this guessing.
 */
export function convertWithinFamily(amount: number, from: string, to: string): number | null {
  const family = unitFamily(from);
  if (family === null || family !== unitFamily(to)) return null;
  const table = family === "volume" ? VOLUME_ML : MASS_G;
  return (amount * table[from]) / table[to];
}

/** Two units combine if they are identical, or share a measurement family. */
export function areCompatible(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  const fa = unitFamily(a);
  return fa !== null && fa === unitFamily(b);
}

export interface Quantity {
  quantity: number | null;
  unit: string | null;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Sum quantities that are already known to be mutually compatible (see
 * `areCompatible`). Cross-family callers must group first. If any entry has no
 * numeric quantity the sum is unknowable, so the total is returned as null with
 * the unit preserved.
 */
export function addCompatible(entries: Quantity[]): Quantity {
  const unit = entries.find((e) => e.unit)?.unit ?? null;
  if (entries.some((e) => e.quantity == null)) {
    return { quantity: null, unit };
  }

  const family = unitFamily(unit);
  if (family === "volume" || family === "mass") {
    const table = family === "volume" ? VOLUME_ML : MASS_G;
    const base = entries.reduce((sum, e) => sum + e.quantity! * table[e.unit ?? "?"], 0);
    return { quantity: round(base / table[unit ?? "?"]), unit };
  }

  return { quantity: round(entries.reduce((sum, e) => sum + e.quantity!, 0)), unit };
}
