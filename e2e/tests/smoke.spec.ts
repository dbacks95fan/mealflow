import { expect, test } from "@playwright/test";
import { resetApp } from "../helpers";

test.beforeEach(async ({ request }) => resetApp(request));

test("home page loads as MealFlow", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("MealFlow");
  await expect(page.getByRole("heading", { level: 1, name: "MealFlow" })).toBeVisible();
});
