// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0003: This Week, Groceries, and Fry's review each
// ABOUTME: show the current step, link back to earlier steps, and keep one
// ABOUTME: primary action, pinned on a phone, that leads to the next step.
import { expect, test, type Page } from "@playwright/test";
import { connectFrys, createRecipe, resetApp } from "../helpers";

function currentStep(page: Page) {
  return page.getByRole("navigation", { name: "Shopping steps" }).locator("a[aria-current=step]");
}

async function expectPinnedAboveTabBar(page: Page, name: string | RegExp) {
  const action = page.locator(".action-bar").getByRole(typeof name === "string" ? "link" : "button", { name });
  await expect(action).toBeInViewport();
  const actionBox = await action.boundingBox();
  const navBox = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navBox!.y + 0.5);
}

test.describe("shopping flow steps", () => {
  test.beforeEach(async ({ request, page }) => {
    await resetApp(request);
    await page.setViewportSize({ width: 375, height: 667 });
    // Enough recipes that each list is taller than the screen, so the action
    // only stays visible if it is pinned.
    for (const name of ["Flow Chili", "Flow Tacos", "Flow Soup", "Flow Pasta", "Flow Curry", "Flow Stew"]) {
      await createRecipe(page, name, [{ name: `${name} base`, qty: "1", unit: "lb" }], { addToWeek: true });
    }
  });

  test("walks Plan → List → Fry's cart with one primary action per step", async ({ page }) => {
    await connectFrys(page);

    await page.goto("/this-week");
    await expect(currentStep(page)).toHaveAccessibleName("Step 1: Plan");
    await expectPinnedAboveTabBar(page, "Build the grocery list");
    await expect(page.locator(".action-bar").getByRole("link")).toHaveCount(1);
    await page.getByRole("link", { name: "Build the grocery list" }).click();

    await expect(page).toHaveURL(/\/groceries$/);
    await expect(currentStep(page)).toHaveAccessibleName("Step 2: List");
    await expect(page.getByRole("link", { name: "Step 1: Plan (done)" })).toBeVisible();
    await expectPinnedAboveTabBar(page, "Match 6 items to Fry’s");
    await page.getByRole("link", { name: "Match 6 items to Fry’s" }).click();

    await expect(page).toHaveURL(/\/frys$/);
    await expect(currentStep(page)).toHaveAccessibleName("Step 3: Fry’s cart");
    await expect(page.locator(".card").first()).toBeVisible();
    await expectPinnedAboveTabBar(page, /add \d+ items? to fry.s cart/i);
    await expect(page.locator(".action-bar").getByRole("button")).toHaveCount(1);
  });

  test("returns to earlier steps from the step bar", async ({ page }) => {
    await page.goto("/frys");
    await page.getByRole("link", { name: "Step 2: List (done)" }).click();
    await expect(page).toHaveURL(/\/groceries$/);
    await page.getByRole("link", { name: "Step 1: Plan (done)" }).click();
    await expect(page).toHaveURL(/\/this-week$/);
    await expect(currentStep(page)).toHaveAccessibleName("Step 1: Plan");
  });
});

test("the step bar shows on This Week and Groceries when nothing is planned", async ({ page, request }) => {
  await resetApp(request);
  await page.goto("/this-week");
  await expect(currentStep(page)).toHaveAccessibleName("Step 1: Plan");
  await page.goto("/groceries");
  await expect(currentStep(page)).toHaveAccessibleName("Step 2: List");
});
