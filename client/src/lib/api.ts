// ABOUTME: Typed wrappers around the MealFlow JSON API. Pages call these, never
// ABOUTME: fetch() directly.

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function empty(res: Response): Promise<void> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
}

const jsonHeaders = { "Content-Type": "application/json" };

export interface Ingredient {
  id: number;
  position: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  raw: string | null;
}

export interface IngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  note?: string | null;
  raw?: string;
}

export interface RecipeSummary {
  id: number;
  name: string;
  servings: number | null;
  tags: string[];
  ingredientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe {
  id: number;
  name: string;
  servings: number | null;
  tags: string[];
  ingredients: Ingredient[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeInput {
  name: string;
  servings?: number | null;
  tags?: string[];
  ingredients: IngredientInput[];
}

export interface RecipeDraft {
  name: string;
  servings: number | null;
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    note: string | null;
    raw: string | null;
  }[];
}

export interface Selection {
  recipeId: number;
  name: string;
  servings: number | null;
  ingredientCount: number;
  addedAt: string;
}

export interface GroceryQuantity {
  quantity: number | null;
  unit: string | null;
}

export interface GroceryContribution {
  recipeId: number;
  recipeName: string;
  quantity: number | null;
  unit: string | null;
}

export interface GroceryLine {
  name: string;
  normalizedName: string;
  quantities: GroceryQuantity[];
  contributions: GroceryContribution[];
  inPantry: boolean;
}

export interface GroceryList {
  lines: GroceryLine[];
  recipeCount: number;
}

export interface PantryItem {
  id: number;
  name: string;
  normalizedName: string;
  createdAt: string;
}

export interface FrysStatus {
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
  locationId: string | null;
  locationName: string | null;
}

export interface FrysLocation {
  locationId: string;
  name: string;
  address: string;
}

export interface FrysProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string | null;
  size: string | null;
  price: number | null;
  imageUrl: string | null;
}

/** How a product's pack size fits the recipe amount (INT-MF-0004). */
export type PackFit =
  | { status: "suggested"; packs: number; needed: string; perPack: string }
  | { status: "manual"; reason: string };

export type FittedProduct = FrysProduct & { fit: PackFit };

export interface FrysMatchLine {
  normalizedName: string;
  name: string;
  quantities: GroceryQuantity[];
  /** Starting quantity: the suggested packs, or 1 for manual review. */
  neededQuantity: number;
  remembered: boolean;
  chosen: FittedProduct | null;
  options: FittedProduct[];
  unmatched: boolean;
}

export interface FrysMatch {
  currency: string;
  total: number;
  lines: FrysMatchLine[];
}

export interface FrysCartResult {
  added: string[];
  failed: { name: string; reason: string }[];
  allSucceeded: boolean;
}

export interface Household {
  id: number;
  name: string;
  frysLocationId: string | null;
  frysLocationName: string | null;
  frysConnected: boolean;
  frysConnectedAt: string | null;
}

export function listRecipes(): Promise<RecipeSummary[]> {
  return fetch("/api/recipes").then((r) => json<RecipeSummary[]>(r));
}

export function getRecipe(id: number): Promise<Recipe> {
  return fetch(`/api/recipes/${id}`).then((r) => json<Recipe>(r));
}

export function createRecipe(input: RecipeInput): Promise<Recipe> {
  return fetch("/api/recipes", { method: "POST", headers: jsonHeaders, body: JSON.stringify(input) }).then(
    (r) => json<Recipe>(r),
  );
}

export function updateRecipe(id: number, input: RecipeInput): Promise<Recipe> {
  return fetch(`/api/recipes/${id}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify(input) }).then(
    (r) => json<Recipe>(r),
  );
}

export function deleteRecipe(id: number): Promise<void> {
  return fetch(`/api/recipes/${id}`, { method: "DELETE" }).then(empty);
}

export function listSelections(): Promise<Selection[]> {
  return fetch("/api/selections").then((r) => json<Selection[]>(r));
}

export function addSelection(recipeId: number): Promise<Selection[]> {
  return fetch("/api/selections", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ recipeId }),
  }).then((r) => json<Selection[]>(r));
}

export function removeSelection(recipeId: number): Promise<Selection[]> {
  return fetch(`/api/selections/${recipeId}`, { method: "DELETE" }).then((r) => json<Selection[]>(r));
}

export function clearSelections(): Promise<void> {
  return fetch("/api/selections", { method: "DELETE" }).then(empty);
}

export function importText(text: string): Promise<RecipeDraft> {
  return fetch("/api/import/text", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ text }),
  }).then((r) => json<RecipeDraft>(r));
}

export function importUrl(url: string): Promise<RecipeDraft> {
  return fetch("/api/import/url", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ url }),
  }).then((r) => json<RecipeDraft>(r));
}

export function getGroceryList(): Promise<GroceryList> {
  return fetch("/api/grocery-list").then((r) => json<GroceryList>(r));
}

export function listPantry(): Promise<PantryItem[]> {
  return fetch("/api/pantry").then((r) => json<PantryItem[]>(r));
}

export function addPantryItem(name: string): Promise<PantryItem[]> {
  return fetch("/api/pantry", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name }) }).then(
    (r) => json<PantryItem[]>(r),
  );
}

export function removePantryItem(id: number): Promise<PantryItem[]> {
  return fetch(`/api/pantry/${id}`, { method: "DELETE" }).then((r) => json<PantryItem[]>(r));
}

export function getHousehold(): Promise<Household> {
  return fetch("/api/household").then((r) => json<Household>(r));
}

export function getFrysStatus(): Promise<FrysStatus> {
  return fetch("/api/frys/status").then((r) => json<FrysStatus>(r));
}

export function getFrysAuthorizeUrl(): Promise<{ url: string }> {
  return fetch("/api/frys/authorize-url").then((r) => json<{ url: string }>(r));
}

export function disconnectFrys(): Promise<void> {
  return fetch("/api/frys/disconnect", { method: "POST" }).then(empty);
}

export function findFrysLocations(zip: string): Promise<FrysLocation[]> {
  return fetch(`/api/frys/locations?zip=${encodeURIComponent(zip)}`).then((r) => json<FrysLocation[]>(r));
}

export function setFrysLocation(locationId: string, name: string): Promise<unknown> {
  return fetch("/api/frys/location", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ locationId, name }),
  }).then((r) => json(r));
}

export function getFrysMatch(): Promise<FrysMatch> {
  return fetch("/api/frys/match").then((r) => json<FrysMatch>(r));
}

export function saveFrysMatch(
  normalizedName: string,
  product: { productId: string; upc?: string; brand?: string | null; size?: string | null; description?: string },
): Promise<unknown> {
  return fetch(`/api/frys/match/${encodeURIComponent(normalizedName)}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(product),
  }).then((r) => json(r));
}

export function submitFrysCart(
  items: { upc: string; quantity: number; name: string }[],
): Promise<FrysCartResult> {
  return fetch("/api/frys/cart", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ items }),
  }).then((r) => json<FrysCartResult>(r));
}

export function renameHousehold(name: string): Promise<Household> {
  return fetch("/api/household", { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ name }) }).then(
    (r) => json<Household>(r),
  );
}
