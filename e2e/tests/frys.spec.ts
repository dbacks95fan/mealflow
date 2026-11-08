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
  await expect(riceCard.getByRole("combobox")).toBeVisible();
  await expect(page.getByText(/Estimated total: \$/)).toBeVisible();

  // Change the brand for rice (persists server-side).
  await riceCard.getByRole("combobox").selectOption({ index: 1 });
  await expect(riceCard.getByRole("combobox")).toHaveValue(/-b$/);

  // Submit to the cart — the "failitem" line has an un-addable UPC.
  await page.getByRole("button", { name: "Add to Fry’s" }).click();
  // Each quantity stepper is also a status region, so pick the cart result.
  const result = page.getByRole("status").filter({ hasText: /added to your Fry/ });
  await expect(result).toContainText(/1 item added/);
  await expect(result).toContainText(/1 failed/);
});
