// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Evidence for INT-MF-0008 at phone and desktop viewports: planning the
// ABOUTME: week from the library, the plan summary, clearing with confirmation,
// ABOUTME: the desktop week panel beside the library, and the empty states.
import { expect, test, type Page } from "@playwright/test";
import { createRecipe, resetApp } from "../helpers";

function libraryCard(page: Page, name: string) {
  return page.locator("li.recipe-card", { has: page.getByRole("heading", { name, exact: true }) });
}

async function seedLibrary(page: Page) {
  await createRecipe(page, "Plan Chili", [{ name: "beans" }, { name: "onions" }]);
  await createRecipe(page, "Plan Tacos", [{ name: "tortillas" }]);
  await createRecipe(page, "Plan Soup", [{ name: "broth" }]);
  await page.goto("/");
}

test.beforeEach(async ({ request }) => resetApp(request));

test.describe("at a phone viewport", () => {
  test.beforeEach(async ({ page }) => page.setViewportSize({ width: 375, height: 667 }));

  test("plans the week from the library with one tap per recipe", async ({ page }) => {
    await seedLibrary(page);
    await expect(page.getByLabel("This week's plan")).toHaveCount(0);
    await expect(page.locator(".library-count")).toHaveText("3 recipes");

    const chili = libraryCard(page, "Plan Chili");
    await chili.getByRole("button", { name: "Add to this week" }).click();
    await expect(chili.getByRole("button", { name: "In this week" })).toHaveAttribute("aria-pressed", "true");
    await libraryCard(page, "Plan Tacos").getByRole("button", { name: "Add to this week" }).click();

    await expect(page.locator(".library-count")).toHaveText("3 recipes · 2 recipes this week");
    const summary = page.getByLabel("This week's plan");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("2 recipes this week");
    await expect(summary).toContainText("Ready to build a grocery list");
    // The summary floats above the tab bar.
    const summaryBox = await summary.boundingBox();
    const navBox = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
    expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(navBox!.y);
    // The desktop panel stays hidden on a phone.
    await expect(page.getByRole("complementary", { name: "This week" })).toBeHidden();

    // Tapping again takes it back out.
    await chili.getByRole("button", { name: "In this week" }).click();
    await expect(chili.getByRole("button", { name: "Add to this week" })).toBeVisible();
    await expect(summary).toContainText("1 recipe this week");

    await summary.getByRole("link", { name: "Review week" }).click();
    await expect(page).toHaveURL(/\/this-week$/);
    // Wait for This Week itself; the URL can change before the library unmounts.
    await expect(page.getByRole("button", { name: "Clear the week" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plan Tacos" })).toBeVisible();
  });

  test("This Week removes recipes and clears only after confirmation", async ({ page }) => {
    await createRecipe(page, "Week Chili", [{ name: "beans" }, { name: "onions" }], { addToWeek: true });
    await createRecipe(page, "Week Tacos", [{ name: "tortillas" }], { addToWeek: true });
    await createRecipe(page, "Week Soup", [{ name: "broth" }], { addToWeek: true });
    await page.goto("/this-week");
    await expect(page.getByText("3 recipes · 4 ingredients before combining")).toBeVisible();

    await page.getByRole("button", { name: "Remove Week Soup from this week" }).click();
    await expect(page.getByRole("heading", { name: "Week Soup" })).toHaveCount(0);
    await expect(page.getByText("2 recipes · 3 ingredients before combining")).toBeVisible();

    await page.getByRole("button", { name: "Clear the week" }).click();
    const confirm = page.getByRole("group", { name: "Confirm clearing the week" });
    await expect(confirm).toContainText("Recipes stay in your library. Only this week’s plan is cleared.");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Week Chili" })).toBeVisible();

    await page.getByRole("button", { name: "Clear the week" }).click();
    await page.getByRole("group", { name: "Confirm clearing the week" }).getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("No recipes selected yet.")).toBeVisible();

    // Recipes stay in the library.
    await page.goto("/");
    await expect(libraryCard(page, "Week Chili")).toBeVisible();
    await expect(libraryCard(page, "Week Chili").getByRole("button", { name: "Add to this week" })).toBeVisible();
  });

  test("empty states point to the next useful action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Your recipe library is empty.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Import a recipe" })).toHaveAttribute("href", "/recipes/import");
    await expect(page.getByRole("link", { name: "Type one in" })).toHaveAttribute("href", "/recipes/new");
    await expect(page.locator(".how-it-works li")).toHaveText([/Add recipes/, /Plan the week/, /Fill the Fry’s cart/]);

    await page.goto("/this-week");
    await expect(page.getByText("No recipes selected yet.")).toBeVisible();
    await page.getByRole("link", { name: "Browse recipes" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("the recipe page's week control shows the plan state", async ({ page }) => {
    await createRecipe(page, "Detail Chili", [{ name: "beans" }]);
    const toggle = page.getByRole("button", { name: "Add to this week" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "In this week" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("navigation", { name: "Primary" }).locator(".nav-badge")).toHaveText("1");
    await page.getByRole("button", { name: "In this week" }).click();
    await expect(page.getByRole("button", { name: "Add to this week" })).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("at a desktop viewport", () => {
  test.beforeEach(async ({ page }) => page.setViewportSize({ width: 1280, height: 800 }));

  test("shows the week's plan beside the library while browsing", async ({ page }) => {
    await seedLibrary(page);
    const panel = page.getByRole("complementary", { name: "This week" });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("No recipes selected yet.");
    await expect(page.getByLabel("This week's plan")).toBeHidden();

    // The panel sits to the right of the recipe cards.
    const panelBox = await panel.boundingBox();
    const gridBox = await page.locator(".recipe-grid").boundingBox();
    expect(panelBox!.x).toBeGreaterThan(gridBox!.x + gridBox!.width - 1);

    await libraryCard(page, "Plan Chili").getByRole("button", { name: "Add to this week" }).click();
    await libraryCard(page, "Plan Soup").getByRole("button", { name: "Add to this week" }).click();
    await expect(panel.getByRole("heading", { name: "Plan Chili" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Plan Soup" })).toBeVisible();
    await expect(panel).toContainText("2 recipes · 3 ingredients before combining");
    await expect(panel.getByRole("link", { name: "Step 1: Plan" })).toBeVisible();

    await panel.getByRole("button", { name: "Remove Plan Soup from this week" }).click();
    await expect(panel.getByRole("heading", { name: "Plan Soup" })).toHaveCount(0);
    await expect(libraryCard(page, "Plan Soup").getByRole("button", { name: "Add to this week" })).toBeVisible();

    await panel.getByRole("button", { name: "Clear" }).click();
    await panel.getByRole("group", { name: "Confirm clearing the week" }).getByRole("button", { name: "Clear" }).click();
    await expect(panel).toContainText("No recipes selected yet.");

    await libraryCard(page, "Plan Tacos").getByRole("button", { name: "Add to this week" }).click();
    await panel.getByRole("link", { name: "Build the grocery list" }).click();
    await expect(page).toHaveURL(/\/groceries$/);
    await expect(page.getByText("tortillas")).toBeVisible();
  });
});
