// ABOUTME: Establishes the client test pattern — render a component inside a
// ABOUTME: router, assert on accessible roles.
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listSelections = vi.fn();
vi.mock("../lib/api", () => ({
  listSelections: () => listSelections(),
  addSelection: vi.fn(),
  removeSelection: vi.fn(),
  clearSelections: vi.fn(),
}));

import { NavBar } from "./NavBar";

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
    </MemoryRouter>,
  );
}

const selection = (recipeId: number) => ({ recipeId, name: `Recipe ${recipeId}`, ingredientCount: 1, servings: null });

describe("NavBar", () => {
  beforeEach(() => {
    listSelections.mockReset();
    listSelections.mockResolvedValue([]);
  });

  it("renders the four primary sections and no Add Recipe item", () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const names = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(names).toEqual(["Recipes", "This Week", "Groceries", "Settings"]);
    expect(screen.queryByRole("link", { name: "Add Recipe" })).not.toBeInTheDocument();
  });

  it("marks the link for the current route active", () => {
    renderNav("/groceries");
    expect(screen.getByRole("link", { name: "Groceries" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Groceries" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Recipes" })).not.toHaveClass("active");
  });

  it("keeps Recipes active on the add, import, and recipe pages", () => {
    for (const path of ["/recipes/new", "/recipes/import", "/recipes/4", "/recipes/4/edit"]) {
      const { unmount } = renderNav(path);
      expect(screen.getByRole("link", { name: "Recipes" })).toHaveClass("active");
      unmount();
    }
  });

  it("keeps Groceries active on Fry's review, the last part of the list", () => {
    renderNav("/frys");
    expect(screen.getByRole("link", { name: "Groceries" })).toHaveClass("active");
  });

  it("shows how many recipes are planned on the This Week link", async () => {
    listSelections.mockResolvedValue([selection(1), selection(2), selection(3)]);
    renderNav("/settings");
    const thisWeek = screen.getByRole("link", { name: "This Week" });
    expect(await screen.findByText("3", { selector: ".nav-badge" })).toBeInTheDocument();
    expect(thisWeek).toHaveAccessibleDescription("3 recipes planned");
  });

  it("shows no badge when nothing is planned", async () => {
    renderNav();
    await screen.findByRole("link", { name: "This Week" });
    expect(listSelections).toHaveBeenCalled();
    expect(document.querySelector(".nav-badge")).toBeNull();
    expect(screen.getByRole("link", { name: "This Week" })).not.toHaveAccessibleDescription();
  });
});
