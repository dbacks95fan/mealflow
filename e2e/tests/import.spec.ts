import { expect, test } from "@playwright/test";
import { resetApp } from "../helpers";

test.beforeEach(async ({ request }) => resetApp(request));

test("paste a recipe, review the extracted ingredients, then save", async ({ page }) => {
  await page.goto("/recipes/import");
  await page.getByRole("radio", { name: /Paste text/ }).check();

  await page.getByLabel(/paste the recipe text/i).fill(
    ["Pasted Curry", "Serves 4", "Ingredients", "2 cups rice", "1 onion, diced", "3 cloves garlic"].join("\n"),
  );
  await page.getByRole("button", { name: /extract ingredients/i }).click();

  // Lands on the review form, pre-filled and not yet saved.
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByLabel("Recipe name")).toHaveValue("Pasted Curry");
  await expect(page.getByLabel("Servings (optional)")).toHaveValue("4");
  await expect(page.getByLabel("Ingredient 1 name")).toHaveValue("rice");
  await expect(page.getByLabel("Ingredient 3 name")).toHaveValue("garlic");

  // Correct one before saving.
  await page.getByLabel("Ingredient 1 name").fill("basmati rice");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: "Pasted Curry" })).toBeVisible();
  await expect(page.getByText(/2 cup basmati rice/)).toBeVisible();
});
