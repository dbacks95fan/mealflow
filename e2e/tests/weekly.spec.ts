import { expect, test } from "@playwright/test";
import { createRecipe, resetApp } from "../helpers";

test.beforeEach(async ({ request }) => resetApp(request));

test("select recipes for the week, view them, remove one, clear the rest", async ({ page }) => {
  await createRecipe(page, "Weekly Chili", [{ name: "beans" }]);
  await createRecipe(page, "Weekly Tacos", [{ name: "tortillas" }]);

  await page.goto("/");
  const chili = page.locator(".card", { hasText: "Weekly Chili" });
  const tacos = page.locator(".card", { hasText: "Weekly Tacos" });
  await chili.getByRole("button", { name: "Add to this week" }).click();
  await expect(chili.getByRole("button", { name: /In this week/ })).toBeVisible();
  await tacos.getByRole("button", { name: "Add to this week" }).click();

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "This Week" }).click();
  // The library's week panel also lists planned recipes, and the router can
  // change the URL before the library unmounts, so wait for This Week itself.
  await expect(page).toHaveURL(/\/this-week$/);
  await expect(page.getByRole("button", { name: "Clear the week" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly Chili" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly Tacos" })).toBeVisible();

  await page.getByRole("button", { name: "Remove Weekly Chili from this week" }).click();
  await expect(page.getByRole("heading", { name: "Weekly Chili" })).toHaveCount(0);

  await page.getByRole("button", { name: "Clear the week" }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText(/no recipes selected/i)).toBeVisible();
});
