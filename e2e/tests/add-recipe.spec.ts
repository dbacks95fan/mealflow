// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0009 at a phone viewport: every source from the
// ABOUTME: one "Add a recipe" screen, reviewing a draft before saving, adding and
// ABOUTME: removing ingredient rows, validation, saving, and editing with the
// ABOUTME: same form.
import { expect, test, type Page } from "@playwright/test";
import { createRecipe, resetApp } from "../helpers";

const WIDTH = 375;

async function expectFitsPhone(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ request, page }) => {
  await resetApp(request);
  await page.setViewportSize({ width: WIDTH, height: 740 });
});

test("the library's + opens one screen offering every source", async ({ page }) => {
  await createRecipe(page, "Seed Soup", [{ name: "broth" }]);
  await page.goto("/");
  await page.getByRole("link", { name: "Add recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/import\?source=type$/);
  await expect(page.getByRole("heading", { name: "Add a recipe" })).toBeVisible();
  for (const source of ["From a web page", "Paste text", "Upload a file", "Type it in"]) {
    await expect(page.getByRole("radio", { name: new RegExp(source) })).toBeAttached();
  }
  await expect(page.getByRole("radio", { name: /Type it in/ })).toBeChecked();
  await expectFitsPhone(page);

  await page.getByRole("link", { name: "Start a blank recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByRole("heading", { name: "New recipe" })).toBeVisible();
});

test("a web page import opens for review before it's saved", async ({ page }) => {
  // The server would fetch the page; stand in for it so the test stays offline.
  await page.route("**/api/import/url", (route) =>
    route.fulfill({
      json: {
        name: "Fetched Chili",
        servings: 6,
        ingredients: [
          { name: "kidney beans", quantity: 2, unit: "can", note: "drained" },
          { name: "ground beef", quantity: 1, unit: "lb", note: null },
        ],
      },
    }),
  );
  await page.goto("/recipes/import");
  await page.getByLabel("Recipe page URL").fill("https://example.com/chili");
  await page.getByRole("button", { name: "Fetch recipe" }).click();

  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByRole("heading", { name: "Review recipe" })).toBeVisible();
  await expect(page.getByRole("note")).toHaveText(
    "Imported from a web page. Check each ingredient, then save. Nothing is saved until you do.",
  );
  await expect(page.getByLabel("Ingredient 1 name")).toHaveValue("kidney beans");

  // Nothing was saved by the import itself.
  const before = await page.request.get("/api/recipes");
  expect(await before.json()).toEqual([]);

  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("heading", { name: "Fetched Chili" })).toBeVisible();
});

test("an uploaded text file opens for review", async ({ page }) => {
  await page.goto("/recipes/import");
  await page.getByRole("radio", { name: /Upload a file/ }).check();
  await page.getByLabel("Choose a .txt, .md, .pdf, or image file").setInputFiles({
    name: "toast.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(["Garlic Toast", "Ingredients", "4 slices bread", "2 tbsp butter"].join("\n")),
  });
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByRole("note")).toContainText("Imported from a file.");
  await expect(page.getByLabel("Recipe name")).toHaveValue("Garlic Toast");
  await expect(page.getByLabel("Ingredient 2 name")).toHaveValue("butter");
});

test("pasted text opens for review", async ({ page }) => {
  await page.goto("/recipes/import");
  await page.getByRole("radio", { name: /Paste text/ }).check();
  await page.getByLabel("Paste the recipe text").fill(["Quick Salad", "Ingredients", "1 head lettuce"].join("\n"));
  await page.getByRole("button", { name: "Extract ingredients" }).click();
  await expect(page.getByRole("note")).toContainText("Imported from pasted text.");
  await expect(page.getByLabel("Recipe name")).toHaveValue("Quick Salad");
});

test("ingredient rows fit a phone, and rows can be added and removed", async ({ page }) => {
  await page.goto("/recipes/new");
  // The form has its own Cancel / Save bar, so the tab bar steps aside.
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  const save = page.getByRole("button", { name: "Save recipe" });
  await expect(save).toBeInViewport();

  await page.getByLabel("Ingredient 1 name").fill("flour");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("Ingredient 2 name").fill("sugar");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("Ingredient 3 name").fill("salt");

  // Each row's name sits on its own line, with quantity, unit, and note below.
  for (const field of ["name", "quantity", "unit", "note"]) {
    const box = await page.getByLabel(`Ingredient 2 ${field}`).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(WIDTH);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const nameBox = await page.getByLabel("Ingredient 2 name").boundingBox();
  const qtyBox = await page.getByLabel("Ingredient 2 quantity").boundingBox();
  expect(qtyBox!.y).toBeGreaterThan(nameBox!.y + nameBox!.height - 1);
  await expectFitsPhone(page);

  await page.getByRole("button", { name: "Remove ingredient 2" }).click();
  await expect(page.getByLabel("Ingredient 2 name")).toHaveValue("salt");
  await expect(page.getByLabel("Ingredient 3 name")).toHaveCount(0);
  // Sticky save stays reachable while scrolled to the bottom.
  await page.getByRole("button", { name: "Add ingredient" }).scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
});

test("validation messages remain, then the recipe saves with tags", async ({ page }) => {
  await page.goto("/recipes/new");
  await page.getByLabel("Ingredient 1 name").fill("bread");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("alert")).toHaveText("A recipe name is required.");

  await page.getByLabel("Recipe name").fill("Toast");
  await page.getByLabel("Ingredient 1 name").fill("");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("alert")).toHaveText("Add at least one ingredient.");

  await page.getByLabel("Ingredient 1 name").fill("bread");
  await page.getByLabel("Ingredient 1 quantity").fill("lots");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("alert")).toHaveText("Ingredient quantities must be numbers.");

  await page.getByLabel("Ingredient 1 quantity").fill("2");
  await page.getByLabel("Ingredient 1 unit").fill("slices");
  await page.getByLabel("Tags (optional)").fill("breakfast");
  await page.getByLabel("Tags (optional)").press("Enter");
  await expect(page.getByRole("list", { name: "Tags" })).toHaveText("breakfast");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: "Toast" })).toBeVisible();
  await expect(page.getByText("2 slice bread")).toBeVisible();
  await expect(page.locator(".tag", { hasText: "breakfast" })).toBeVisible();
});

test("editing a recipe uses the same form", async ({ page }) => {
  await createRecipe(page, "Edit Pancakes", [{ name: "flour", qty: "2", unit: "cups" }]);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit recipe" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await expect(page.getByLabel("Ingredient 1 name")).toHaveValue("flour");

  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("Ingredient 2 name").fill("milk");
  await page.getByLabel("Ingredient 2 quantity").fill("1.5");
  await page.getByLabel("Ingredient 2 unit").fill("cup");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page.getByRole("heading", { name: "Edit Pancakes" })).toBeVisible();
  await expect(page.getByText(/1½ cup milk/)).toBeVisible();
});
