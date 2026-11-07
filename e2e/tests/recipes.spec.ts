import { expect, test } from "@playwright/test";
import { resetApp } from "../helpers";

test.beforeEach(async ({ request }) => resetApp(request));

test("create, view, edit, and delete a recipe with structured ingredients", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/recipe library is empty/i)).toBeVisible();
  await page.getByRole("link", { name: "Type one in" }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);

  await page.getByLabel("Recipe name").fill("Playwright Pancakes");
  await page.getByLabel("Servings (optional)").fill("4");
  await page.getByLabel("Ingredient 1 name").fill("flour");
  await page.getByLabel("Ingredient 1 quantity").fill("2");
  await page.getByLabel("Ingredient 1 unit").fill("cups");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("Ingredient 2 name").fill("eggs");
  await page.getByLabel("Ingredient 2 quantity").fill("2");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: "Playwright Pancakes" })).toBeVisible();
  await expect(page.getByText(/2 cup flour/)).toBeVisible();
  await expect(page.getByText(/2 eggs/)).toBeVisible();

  await page.getByRole("link", { name: "Recipes" }).click();
  await expect(page.getByRole("heading", { name: "Playwright Pancakes" })).toBeVisible();
  await expect(page.getByText(/recipe library is empty/i)).toHaveCount(0);

  await page.getByRole("heading", { name: "Playwright Pancakes" }).click();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Recipe name").fill("Playwright Waffles");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("heading", { name: "Playwright Waffles" })).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/recipe library is empty/i)).toBeVisible();
});
