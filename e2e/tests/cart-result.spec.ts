// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0006 against the mock Kroger server: the cart
// ABOUTME: result for full success, partial failure, and unmatched items, the
// ABOUTME: checkout note, and the way back to the Fry's review screen.
import { expect, test, type Page } from "@playwright/test";
import { connectFrys, createRecipe, resetApp, type RecipeRow } from "../helpers";

// Mock data (e2e/mock-kroger.mjs): a term containing "fail" gets an un-addable
// UPC; "unicorn" has no Fry's match.

async function submitWeek(page: Page, rows: RecipeRow[]) {
  await createRecipe(page, "Cart Night", rows, { addToWeek: true });
  await connectFrys(page);
  await page.goto("/frys");
  await page.getByRole("button", { name: /^Add \d+ items? to Fry’s cart$/ }).click();
}

const CHECKOUT = "Checkout happens in the Fry’s app or website. MealFlow only fills the cart.";

test.beforeEach(async ({ request, page }) => {
  await resetApp(request);
  await page.setViewportSize({ width: 375, height: 667 });
});

test("full success says how many were added and nothing more", async ({ page }) => {
  await submitWeek(page, [
    { name: "ground beef", qty: "3.5", unit: "lb" },
    { name: "crushed tomatoes", qty: "28", unit: "oz" },
  ]);
  await expect(page.getByRole("heading", { name: "2 of 2 items added to your Fry’s cart" })).toBeVisible();
  await expect(page.getByText(/Not everything made it/)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Failed items" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Items not sent" })).toHaveCount(0);
  await expect(page.getByText(CHECKOUT)).toBeVisible();

  const added = page.getByRole("button", { name: /2 items added/ });
  await added.click();
  await expect(page.getByRole("region", { name: "Added items" })).toContainText("Brand A ground beef× 2");
  await expect(page.getByRole("region", { name: "Added items" })).toContainText("Brand A crushed tomatoes× 2");
});

test("partial failure lists each failed item with Fry's reason", async ({ page }) => {
  await submitWeek(page, [{ name: "ground beef", qty: "3.5", unit: "lb" }, { name: "failitem" }]);
  await expect(page.getByRole("heading", { name: "1 of 2 items added to your Fry’s cart" })).toBeVisible();
  await expect(page.getByText("Not everything made it. Here is exactly what happened, so nothing is missed.")).toBeVisible();
  const failed = page.getByRole("region", { name: "Failed items" });
  await expect(failed).toContainText("1 item failed");
  // The reason is whatever the mock Fry's cart returned for the bad UPC.
  await expect(failed.getByRole("listitem")).toHaveText(/^Brand A failitem: .+/);
  await expect(page.getByText(CHECKOUT)).toBeVisible();
});

test("items with no Fry's match are listed apart as not sent", async ({ page }) => {
  await submitWeek(page, [{ name: "ground beef", qty: "3.5", unit: "lb" }, { name: "unicorn dust", qty: "1" }]);
  // One item was sent and added, but the result still says it isn't complete.
  await expect(page.getByRole("heading", { name: "1 of 1 item added to your Fry’s cart" })).toBeVisible();
  await expect(page.getByText(/Not everything made it/)).toBeVisible();
  const notSent = page.getByRole("region", { name: "Items not sent" });
  await expect(notSent).toContainText("1 item had no Fry’s match");
  await expect(notSent).toContainText("unicorn dust. Add it yourself in the Fry’s app.");
});

test("the household can go back to the review screen, or finish", async ({ page }) => {
  await submitWeek(page, [{ name: "ground beef", qty: "3.5", unit: "lb" }]);
  await expect(page.getByRole("heading", { name: "1 of 1 item added to your Fry’s cart" })).toBeVisible();

  await page.getByRole("button", { name: "Back to products" }).click();
  await expect(page.getByRole("heading", { name: "Fry’s products" })).toBeVisible();
  await expect(page.getByRole("group", { name: "ground beef quantity" }).locator("output")).toHaveText("2");

  await page.getByRole("button", { name: "Add 1 item to Fry’s cart" }).click();
  await page.getByRole("link", { name: "Done", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
