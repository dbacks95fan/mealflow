// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0004 against the mock Kroger server: suggested
// ABOUTME: pack counts, the manual review indicator, the change to Reviewed, and
// ABOUTME: an estimated total that follows the current quantities.
import { expect, test, type Page } from "@playwright/test";
import { connectFrys, createRecipe, resetApp } from "../helpers";

// Mock pack sizes (e2e/mock-kroger.mjs), option a / option b; every price is
// $3.49 for a and $4.19 for b.
//   ground beef       3 lb   / 1 lb
//   crushed tomatoes  14.5 oz / 28 oz
//   cheese            8 oz   / 16 oz
//   onions            3 lb   / 2 lb
//   mystery spice     "family size" (can't be read)

function card(page: Page, name: string) {
  return page.locator(".card", { has: page.locator("strong", { hasText: new RegExp(`^${name}$`) }) });
}

function stepperValue(page: Page, name: string) {
  return page.getByRole("group", { name: `${name} quantity` }).locator("output");
}

test.beforeEach(async ({ request, page }) => {
  await resetApp(request);
  await page.setViewportSize({ width: 375, height: 667 });
  await createRecipe(
    page,
    "Pack Dinner",
    [
      { name: "ground beef", qty: "3.5", unit: "lb" },
      { name: "crushed tomatoes", qty: "28", unit: "oz" },
      { name: "cheese", qty: "3", unit: "cups" },
      { name: "onions", qty: "3" },
      { name: "mystery spice", qty: "2", unit: "tsp" },
    ],
    { addToWeek: true },
  );
  await connectFrys(page);
  await page.goto("/frys");
  await expect(card(page, "ground beef")).toBeVisible();
});

test("suggests pack counts, rounded up, for comparable units", async ({ page }) => {
  const beef = card(page, "ground beef");
  await expect(beef.getByText("Suggested 2 packs")).toBeVisible();
  await expect(beef.getByText("3.5 lb needed ÷ 3 lb per pack, rounded up.")).toBeVisible();
  await expect(stepperValue(page, "ground beef")).toHaveText("2");

  const tomatoes = card(page, "crushed tomatoes");
  await expect(tomatoes.getByText("Suggested 2 packs")).toBeVisible();
  await expect(tomatoes.getByText("28 oz needed ÷ 14.5 oz per pack, rounded up.")).toBeVisible();
  await expect(stepperValue(page, "crushed tomatoes")).toHaveText("2");
});

test("marks items that can't be converted for manual review at a quantity of 1", async ({ page }) => {
  await expect(page.getByText("3 items need manual review before you add them.")).toBeVisible();

  const cheese = card(page, "cheese");
  await expect(cheese).toHaveClass(/needs-review/);
  await expect(cheese.getByRole("note")).toHaveText(
    "Manual review. Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically. Set the quantity yourself.",
  );
  await expect(stepperValue(page, "cheese")).toHaveText("1");

  await expect(card(page, "onions").getByRole("note")).toContainText("Can't convert a count to weight automatically.");
  await expect(stepperValue(page, "onions")).toHaveText("1");

  await expect(card(page, "mystery spice").getByRole("note")).toContainText('Can\'t read the pack size "family size".');
  await expect(stepperValue(page, "mystery spice")).toHaveText("1");
});

test("a manual review item changes to Reviewed once its quantity is set", async ({ page }) => {
  const cheese = card(page, "cheese");
  await page.getByRole("button", { name: "Increase cheese quantity" }).click();
  await expect(stepperValue(page, "cheese")).toHaveText("2");
  await expect(cheese.getByRole("note")).toHaveText(
    "Reviewed. You set this quantity. Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically.",
  );
  await expect(cheese).not.toHaveClass(/needs-review/);
  await expect(page.getByText("2 items need manual review before you add them.")).toBeVisible();

  // Choosing another product that also can't convert returns it to manual review.
  await cheese.getByRole("combobox").selectOption({ index: 1 });
  await expect(cheese.getByRole("note")).toContainText("Manual review. Recipe needs 3 cup, pack is 16 oz.");
  await expect(stepperValue(page, "cheese")).toHaveText("1");
  await expect(page.getByText("3 items need manual review before you add them.")).toBeVisible();
});

test("the household can change any quantity, and the total follows", async ({ page }) => {
  // a-products: beef 2, tomatoes 2, cheese 1, onions 1, spice 1 = 7 × $3.49.
  await expect(page.getByText("Estimated total: $24.43")).toBeVisible();

  await page.getByRole("button", { name: "Increase ground beef quantity" }).click();
  await expect(card(page, "ground beef").getByText("Changed from the suggested 2.")).toBeVisible();
  await expect(page.getByText("Estimated total: $27.92")).toBeVisible();

  await page.getByRole("button", { name: "Decrease crushed tomatoes quantity" }).click();
  await expect(stepperValue(page, "crushed tomatoes")).toHaveText("1");
  await expect(page.getByText("Estimated total: $24.43")).toBeVisible();

  await card(page, "ground beef").getByRole("button", { name: "Use suggestion" }).click();
  await expect(stepperValue(page, "ground beef")).toHaveText("2");
  await expect(card(page, "ground beef").getByText(/Changed from the suggested/)).toHaveCount(0);

  // Switching beef to the 1 lb pack resets it to that product's suggestion (4).
  await card(page, "ground beef").getByRole("combobox").selectOption({ index: 1 });
  await expect(card(page, "ground beef").getByText("Suggested 4 packs")).toBeVisible();
  await expect(stepperValue(page, "ground beef")).toHaveText("4");
  // beef 4 × $4.19 + tomatoes 1 + cheese 1 + onions 1 + spice 1 at $3.49.
  await expect(page.getByText("Estimated total: $30.72")).toBeVisible();
});

test("the cart receives the quantities on screen", async ({ page }) => {
  await page.getByRole("button", { name: "Increase cheese quantity" }).click();
  const cartCall = page.waitForRequest((req) => req.url().endsWith("/api/frys/cart") && req.method() === "POST");
  await page.getByRole("button", { name: /add to fry.s/i }).click();
  const body = (await cartCall).postDataJSON() as { items: { name: string; quantity: number }[] };
  const byName = Object.fromEntries(body.items.map((i) => [i.name, i.quantity]));
  expect(byName).toMatchObject({
    "Brand A ground beef": 2,
    "Brand A crushed tomatoes": 2,
    "Brand A cheese": 2,
    "Brand A onions": 1,
    "Brand A mystery spice": 1,
  });
});
