// ABOUTME: Evidence for INT-MF-0002: at a phone viewport, every button, button
// ABOUTME: link, nav link, and text field on each screen meets the 44px touch target, and screens render in both color schemes.
import { expect, test, type Page } from "@playwright/test";
import { createRecipe, resetApp } from "../helpers";

const MIN = 44;
// Subpixel layout can land a 44px box at 43.99px.
const TOLERANCE = 0.5;

const TARGETS = [
  "button:visible",
  "a.button:visible",
  "a.nav-link:visible",
  "input:not([type=checkbox]):not([type=radio]):not([type=hidden]):visible",
  "select:visible",
].join(", ");

async function undersizedTargets(page: Page): Promise<string[]> {
  const failures: string[] = [];
  for (const el of await page.locator(TARGETS).all()) {
    const box = await el.boundingBox();
    if (!box) continue;
    const tag = await el.evaluate((n) => n.tagName.toLowerCase());
    const isField = tag === "input" || tag === "select";
    const tooShort = box.height + TOLERANCE < MIN;
    const tooNarrow = !isField && box.width + TOLERANCE < MIN;
    if (tooShort || tooNarrow) {
      const name = (await el.getAttribute("aria-label")) ?? (await el.innerText()).trim() ?? tag;
      failures.push(`${tag} "${name}" is ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
  }
  return failures;
}

const SCREENS = ["/", "/recipes/new", "/recipes/import", "/this-week", "/groceries", "/settings"];

test.describe("design foundation", () => {
  test.beforeEach(async ({ request, page }) => {
    await resetApp(request);
    await page.setViewportSize({ width: 375, height: 667 });
  });

  for (const path of SCREENS) {
    test(`touch targets on ${path} meet ${MIN}px`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await undersizedTargets(page)).toEqual([]);
    });
  }

  test("touch targets on a recipe and a populated grocery list meet 44px", async ({ page }) => {
    await createRecipe(page, "Turkey Chili", [{ name: "ground turkey", qty: "2", unit: "lb" }], { addToWeek: true });
    expect(await undersizedTargets(page)).toEqual([]);
    await page.goto("/groceries");
    await expect(page.getByText("ground turkey")).toBeVisible();
    expect(await undersizedTargets(page)).toEqual([]);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`recipe library renders in ${scheme} mode with the scheme's surface color`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      expect(bg).toBe(scheme === "dark" ? "rgb(19, 19, 19)" : "rgb(247, 241, 226)");
      await expect(page.getByRole("heading", { name: "MealFlow" })).toBeVisible();
    });
  }
});
