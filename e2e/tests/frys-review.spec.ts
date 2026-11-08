// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0005 at a phone viewport against the mock Kroger
// ABOUTME: server: product photos and placeholders, comparing and choosing a
// ABOUTME: product, changing a quantity with the total following, a remembered
// ABOUTME: choice, and an item with no Fry's match.
import { expect, test, type Page } from "@playwright/test";
import { connectFrys, createRecipe, resetApp } from "../helpers";

// Mock data (e2e/mock-kroger.mjs): ground beef is 3 lb ($3.49) or 1 lb ($4.19)
// with photos; mystery spice has no photo; "unicorn dust" has no match.

function card(page: Page, name: string) {
  return page.locator(".card", { has: page.locator("strong", { hasText: new RegExp(`^${name}$`) }) });
}

function total(page: Page) {
  return page.locator(".action-total");
}

test.beforeEach(async ({ request, page }) => {
  await resetApp(request);
  await page.setViewportSize({ width: 375, height: 667 });
  await createRecipe(
    page,
    "Review Night",
    [
      { name: "ground beef", qty: "3.5", unit: "lb" },
      { name: "mystery spice", qty: "2", unit: "tsp" },
      { name: "unicorn dust", qty: "1" },
    ],
    { addToWeek: true },
  );
  await connectFrys(page);
  await page.goto("/frys");
  await expect(card(page, "ground beef")).toBeVisible();
});

test("shows each chosen product's photo, brand, description, size, and price", async ({ page }) => {
  const beef = card(page, "ground beef");
  const photo = beef.getByRole("img", { name: "Brand A · Brand A ground beef · 3 lb" });
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src", /^data:image\/png/);
  // The photo actually loaded (the CSP allows it), rather than falling back.
  expect(await photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(beef).toContainText("Need 3½ lb");
  await expect(beef).toContainText("Brand A ground beef · 3 lb");
  await expect(beef).toContainText("$3.49 × 2 = $6.98");

  await expect(
    card(page, "mystery spice").getByRole("img", { name: "No photo for Brand A · Brand A mystery spice · family size" }),
  ).toBeVisible();

  await expect(page.getByText("Fry's Central")).toBeVisible();
  await expect(page.getByRole("link", { name: "Change store" })).toHaveAttribute("href", "/settings");
});

test("compares options, chooses one, and the total follows the quantity", async ({ page }) => {
  // beef 2 × $3.49 + spice 1 × $3.49
  await expect(total(page)).toHaveText("Estimated total $10.47");

  const beef = card(page, "ground beef");
  await beef.getByRole("button", { name: "Change product (2 options)" }).click();
  const options = beef.getByRole("group", { name: "Choose a product for ground beef" });
  const onePound = options.getByRole("radio", { name: /Brand B ground beef · 1 lb/ });
  await expect(options.getByRole("radio", { name: /Brand A ground beef · 3 lb/ })).toBeChecked();
  await expect(options.locator("label").nth(0)).toContainText("Suggested 2 packs");
  await expect(options.locator("label").nth(1)).toContainText("Suggested 4 packs");
  await expect(options.locator("label").nth(1)).toContainText("$4.19");
  await expect(options.getByRole("img")).toHaveCount(2);

  // The radio rows are large enough to tap.
  const row = await options.locator("label").nth(1).boundingBox();
  expect(row!.height).toBeGreaterThanOrEqual(44);

  await onePound.check();
  await expect(onePound).toBeChecked();
  await expect(beef.getByRole("group", { name: "ground beef quantity" }).locator("output")).toHaveText("4");
  // beef 4 × $4.19 + spice $3.49
  await expect(total(page)).toHaveText("Estimated total $20.25");

  await page.getByRole("button", { name: "Increase ground beef quantity" }).click();
  await expect(total(page)).toHaveText("Estimated total $24.44");
  await expect(beef).toContainText("$4.19 × 5 = $20.95");
});

test("a remembered choice is marked and shows its photo", async ({ page }) => {
  const beef = card(page, "ground beef");
  await expect(beef.getByText("Remembered")).toHaveCount(0);
  await beef.getByRole("button", { name: "Change product (2 options)" }).click();
  await beef.getByRole("radio", { name: /Brand B ground beef · 1 lb/ }).check();
  // The mock answers a saved product's lookup only with "Saved <id>" details;
  // once the save lands, a reload shows the remembered choice.
  await expect(beef.getByText("Remembered")).toHaveCount(0);
  await page.reload();

  const remembered = card(page, "ground beef");
  await expect(remembered.getByText("Remembered")).toBeVisible();
  await expect(remembered).toContainText("Saved mock-ground-beef-b");
  const photo = remembered.locator("img.product-image");
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute("src", /^data:image\/png/);
  await expect(remembered.getByText("Only one match found.")).toBeVisible();
});

test("an item with no Fry's match is clearly marked and not counted", async ({ page }) => {
  const unicorn = card(page, "unicorn dust");
  await expect(unicorn.getByRole("note")).toHaveText("No Fry’s product found. Add this one in the Fry’s app.");
  await expect(page.getByRole("button", { name: "Add 2 items to Fry’s cart" })).toBeVisible();
});
