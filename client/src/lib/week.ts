// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Wording for the week's plan, shared by the library, its desktop week
// ABOUTME: panel, and This Week (INT-MF-0008).
import type { Selection } from "./api";

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "2 recipes · 11 ingredients before combining" */
export function weekSummary(selections: Selection[]): string {
  const ingredients = selections.reduce((sum, s) => sum + s.ingredientCount, 0);
  return `${plural(selections.length, "recipe")} · ${plural(ingredients, "ingredient")} before combining`;
}

/** "6 ingredients · serves 4" */
export function recipeMeta(ingredientCount: number, servings: number | null): string {
  return `${plural(ingredientCount, "ingredient")}${servings ? ` · serves ${servings}` : ""}`;
}
