// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0007 at a phone viewport: each line's amount and
// ABOUTME: recipes, marking and unmarking pantry items, hiding them, the summary
// ABOUTME: counts, and the number of items the next step sends to Fry's.
import { expect, test, type Page } from "@playwright/test";
import { connectFrys, createRecipe, resetApp } from "../helpers";

function summary(page: Page) {
  return page.locator(".grocery-summary p");
}

function pantryButton(page: Page, name: string) {
  return page.getByRole("button", { name: `Have it: ${name}` });
}

test.beforeEach(async ({ request, page }) => {
  await resetApp(request);
  await page.setViewportSize({ width: 375, height: 667 });
  await createRecipe(
    page,
    "Phone Chili",
    [
      { name: "ground beef", qty: "1", unit: "lb" },
      { name: "onions", qty: "2" },
      { name: "salt", qty: "1", unit: "tsp" },
    ],
    { addToWeek: true },
  );
  await createRecipe(
    page,
    "Phone Tacos",
    [
      { name: "ground beef", qty: "8", unit: "oz" },
      { name: "tortillas", qty: "8" },
    ],
    { addToWeek: true },
  );
  await page.goto("/groceries");
});

test("each line shows the ingredient, its combined amount, and its recipes", async ({ page }) => {
  const beef = page.locator(".grocery-row", { hasText: "ground beef" });
  await expect(beef.locator("strong")).toHaveText("ground beef");
  await expect(beef.locator(".grocery-amount")).toHaveText("1½ lb");
  await expect(beef).toContainText("From Phone Chili, Phone Tacos");
  // One compact list: every line fits in a single card.
  await expect(page.locator("ul.grocery-list")).toHaveCount(1);
  await expect(page.locator(".grocery-row")).toHaveCount(4);
});

test("marks and unmarks pantry items, with counts that follow", async ({ page }) => {
  await expect(summary(page)).toHaveText("4 items · 0 in pantry");
  await expect(page.getByRole("link", { name: "Match 4 items to Fry’s" })).toBeVisible();

  const salt = pantryButton(page, "salt");
  const box = await salt.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);

  await salt.click();
  await expect(salt).toHaveAttribute("aria-pressed", "true");
  await expect(salt).toHaveText("Have it");
  await expect(page.locator(".grocery-row", { hasText: "salt" })).toHaveClass(/in-pantry/);
  await expect(summary(page)).toHaveText("4 items · 1 in pantry");
  await expect(page.getByRole("link", { name: "Match 3 items to Fry’s" })).toBeVisible();

  await salt.click();
  await expect(salt).toHaveAttribute("aria-pressed", "false");
  await expect(salt).toHaveText("Have it?");
  await expect(summary(page)).toHaveText("4 items · 0 in pantry");
  await expect(page.getByRole("link", { name: "Match 4 items to Fry’s" })).toBeVisible();
});

test("hides and shows pantry items", async ({ page }) => {
  await pantryButton(page, "salt").click();
  await expect(summary(page)).toHaveText("4 items · 1 in pantry");

  const hide = page.getByRole("switch", { name: "Hide what I have" });
  await hide.click();
  await expect(hide).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".grocery-row", { hasText: "salt" })).toHaveCount(0);
  await expect(page.locator(".grocery-row")).toHaveCount(3);
  // Hiding doesn't change the counts.
  await expect(summary(page)).toHaveText("4 items · 1 in pantry");

  await hide.click();
  await expect(page.locator(".grocery-row", { hasText: "salt" })).toBeVisible();
});

test("the next step matches the count it promised", async ({ page }) => {
  await pantryButton(page, "salt").click();
  await expect(page.getByText("Items you already have are skipped.")).toBeVisible();
  await connectFrys(page);
  await page.goto("/groceries");
  await page.getByRole("link", { name: "Match 3 items to Fry’s" }).click();
  await expect(page).toHaveURL(/\/frys$/);
  await expect(page.getByRole("button", { name: "Add 3 items to Fry’s cart" })).toBeVisible();
});
