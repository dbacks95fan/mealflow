import { expect, test } from "@playwright/test";
import { createRecipe, resetApp } from "../helpers";

test.beforeEach(async ({ request }) => resetApp(request));

test("connect Fry's, pick a store, review matches, and add to cart with a partial failure", async ({
  page,
}) => {
  await createRecipe(page, "Fry Dinner", [{ name: "rice" }, { name: "failitem" }], {
    addToWeek: true,
  });

  // Connect (the mock authorize server redirects straight back with a code).
  await page.goto("/settings");
  await page.getByRole("button", { name: "Connect Fry’s" }).click();
  await expect(page).toHaveURL(/\/settings\?frys=connected$/);
  await expect(page.getByText("Fry’s account connected.")).toBeVisible();

  // Pick a home store.
  await page.getByLabel("ZIP code").fill("85001");
  await page.getByRole("button", { name: "Find stores" }).click();
  await page.getByRole("button", { name: "Use this store" }).click();
  await expect(page.getByRole("button", { name: "Home store ✓" })).toBeVisible();

  // Review the product matches.
  await page.goto("/frys");
  const riceCard = page.locator(".card", { hasText: "rice" });
  await expect(riceCard.getByRole("button", { name: "Change product (2 options)" })).toBeVisible();
  await expect(page.locator(".action-total")).toHaveText(/Estimated total \$/);

  // Change the brand for rice (persists server-side).
  await riceCard.getByRole("button", { name: "Change product (2 options)" }).click();
  await riceCard.getByRole("radio", { name: /Brand B/ }).check();
  await expect(riceCard.getByRole("radio", { name: /Brand B/ })).toBeChecked();

  // Submit to the cart — the "failitem" line has an un-addable UPC.
  await page.getByRole("button", { name: "Add 2 items to Fry’s cart" }).click();
  await expect(page.getByRole("heading", { name: "1 of 2 items added to your Fry’s cart" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Failed items" })).toContainText("1 item failed");
});
