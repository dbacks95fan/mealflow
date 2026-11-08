import { expect, test, type Page } from "@playwright/test";
import { createRecipe, resetApp } from "../helpers";

test.beforeEach(async ({ request }) => resetApp(request));

const SECTIONS = [
  { name: "Recipes", url: /\/$/ },
  { name: "This Week", url: /\/this-week$/ },
  { name: "Groceries", url: /\/groceries$/ },
  { name: "Settings", url: /\/settings$/ },
];

function primaryNav(page: Page) {
  return page.getByRole("navigation", { name: "Primary" });
}

test.describe("navigation", () => {
  test("moves between every primary section and marks the active one", async ({ page }) => {
    await page.goto("/");
    const nav = primaryNav(page);
    await expect(nav.getByRole("link", { name: "Recipes" })).toHaveClass(/active/);

    for (const section of SECTIONS) {
      const link = nav.getByRole("link", { name: section.name });
      await link.click();
      await expect(page).toHaveURL(section.url);
      await expect(link).toHaveClass(/active/);
      await expect(nav.locator(".nav-link.active")).toHaveCount(1);
    }
  });

  test("Add Recipe is no longer a navigation item; the library offers Add and Import", async ({ page }) => {
    await page.goto("/");
    await expect(primaryNav(page).getByRole("link", { name: "Add Recipe" })).toHaveCount(0);
    await page.getByRole("link", { name: /add (your )?first recipe/i }).click();
    await expect(page).toHaveURL(/\/recipes\/new$/);
    await expect(primaryNav(page).getByRole("link", { name: "Recipes" })).toHaveClass(/active/);
    await page.goto("/");
    await page.getByRole("link", { name: "Import a recipe" }).click();
    await expect(page).toHaveURL(/\/recipes\/import$/);
  });

  test("retains the current route on refresh", async ({ page }) => {
    await page.goto("/groceries");
    await page.reload();
    await expect(page).toHaveURL(/\/groceries$/);
    await expect(primaryNav(page).getByRole("link", { name: "Groceries" })).toHaveClass(/active/);

    await page.goto("/frys");
    await page.reload();
    await expect(page).toHaveURL(/\/frys$/);
    await expect(page.getByRole("link", { name: "Step 3: Fry’s cart" })).toHaveAttribute("aria-current", "step");
  });

  test("shows the household name in the header and updates it after a rename", async ({ page }) => {
    await page.goto("/settings");
    const field = page.getByLabel("Household name");
    await expect(field).not.toHaveValue("");
    await field.fill("The Test Household");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.locator(".household-name")).toHaveText("The Test Household");
    await page.goto("/");
    await expect(page.locator(".household-name")).toHaveText("The Test Household");
  });

  test.describe("at a phone viewport", () => {
    test.beforeEach(async ({ page }) => page.setViewportSize({ width: 375, height: 667 }));

    test("primary navigation fits on one row at the bottom and reaches every section", async ({ page }) => {
      await page.goto("/");
      const nav = primaryNav(page);
      const links = nav.getByRole("link");
      await expect(links).toHaveCount(4);

      const boxes = await Promise.all((await links.all()).map((l) => l.boundingBox()));
      const tops = boxes.map((b) => Math.round(b!.y));
      expect(new Set(tops).size).toBe(1);
      for (const box of boxes) {
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 0.5);
      }
      const navBox = await nav.boundingBox();
      expect(navBox!.y + navBox!.height).toBeCloseTo(667, 0);

      for (const section of SECTIONS) {
        const link = nav.getByRole("link", { name: section.name });
        await link.click();
        await expect(page).toHaveURL(section.url);
        await expect(link).toHaveAttribute("aria-current", "page");
      }
    });

    test("shows how many recipes are planned without opening This Week", async ({ page }) => {
      await createRecipe(page, "Badge Chili", [{ name: "beans" }], { addToWeek: true });
      await createRecipe(page, "Badge Tacos", [{ name: "tortillas" }], { addToWeek: true });
      await page.goto("/settings");
      const thisWeek = primaryNav(page).getByRole("link", { name: "This Week" });
      await expect(thisWeek.locator(".nav-badge")).toHaveText("2");
      await expect(thisWeek).toHaveAccessibleDescription("2 recipes planned");

      // Removing one from the library updates the badge in place.
      await page.goto("/");
      await page.locator(".card", { hasText: "Badge Tacos" }).getByRole("button", { name: /in this week/i }).click();
      await expect(thisWeek.locator(".nav-badge")).toHaveText("1");
    });
  });
});
