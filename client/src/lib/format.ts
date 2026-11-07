// ABOUTME: Display helpers for ingredient quantities and lines (fractions,
// ABOUTME: servings scaling).

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

export function formatQuantity(q: number | null): string {
  if (q == null) return "";
  const whole = Math.floor(q);
  const frac = q - whole;

  let glyph = "";
  let best = 0.04;
  for (const [value, symbol] of FRACTIONS) {
    const delta = Math.abs(frac - value);
    if (delta < best) {
      best = delta;
      glyph = symbol;
    }
  }
  if (glyph) return whole ? `${whole}${glyph}` : glyph;
  if (frac < 0.04) return String(whole);
  return String(Math.round(q * 100) / 100);
}

export interface DisplayIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  note?: string | null;
}

export function formatIngredient(ingredient: DisplayIngredient, scale = 1): string {
  const quantity =
    ingredient.quantity != null ? formatQuantity(ingredient.quantity * scale) : "";
  const line = [quantity, ingredient.unit ?? "", ingredient.name].filter(Boolean).join(" ");
  return ingredient.note ? `${line} (${ingredient.note})` : line;
}

export function formatAmount(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? "some";
  return [formatQuantity(quantity), unit ?? ""].filter(Boolean).join(" ");
}

export function formatAmounts(quantities: { quantity: number | null; unit: string | null }[]): string {
  if (quantities.length === 0) return "";
  return quantities.map((q) => formatAmount(q.quantity, q.unit)).join(" + ");
}

/** A price in dollars, e.g. "$3.49". */
export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}
