// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: RecipeLibrary (INT-MF-0008) — the one-tap Week toggle, the planned
// ABOUTME: count and next step, search, the week panel, and the empty library.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { api } = vi.hoisted(() => ({
  api: {
    listRecipes: vi.fn(),
    listSelections: vi.fn(),
    addSelection: vi.fn(),
    removeSelection: vi.fn(),
    clearSelections: vi.fn(),
  },
}));
vi.mock("../lib/api", () => api);

import { RecipeLibrary } from "./RecipeLibrary";

const recipe = (id: number, name: string, tags: string[] = []) => ({
  id,
  name,
  servings: 4,
  tags,
  ingredientCount: 3,
  createdAt: "",
  updatedAt: "",
});
const selection = (recipeId: number, name: string) => ({ recipeId, name, servings: 4, ingredientCount: 3, addedAt: "" });

const render_ = () =>
  render(
    <MemoryRouter>
      <RecipeLibrary />
    </MemoryRouter>,
  );

// The week panel repeats planned recipes, so look inside the library's cards.
const card = (name: string) =>
  screen
    .getAllByRole("heading", { name, level: 3 })
    .map((h) => h.closest("li.recipe-card"))
    .find(Boolean) as HTMLElement;
const grid = () => document.querySelector(".recipe-grid") as HTMLElement;

describe("RecipeLibrary", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.listRecipes.mockResolvedValue([recipe(1, "Chili", ["beef"]), recipe(2, "Tacos", ["quick"])]);
    api.listSelections.mockResolvedValue([selection(1, "Chili")]);
  });

  it("shows whether each recipe is planned and toggles it with one tap", async () => {
    api.addSelection.mockResolvedValue([selection(1, "Chili"), selection(2, "Tacos")]);
    api.removeSelection.mockResolvedValue([selection(2, "Tacos")]);
    const user = userEvent.setup();
    render_();

    await screen.findAllByRole("heading", { name: "Chili", level: 3 });
    const chiliToggle = within(card("Chili")).getByRole("button", { name: "In this week" });
    expect(chiliToggle).toHaveAttribute("aria-pressed", "true");
    expect(card("Chili")).toHaveClass("selected");
    const tacosToggle = within(card("Tacos")).getByRole("button", { name: "Add to this week" });
    expect(tacosToggle).toHaveAttribute("aria-pressed", "false");

    await user.click(tacosToggle);
    expect(api.addSelection).toHaveBeenCalledWith(2);
    expect(within(card("Tacos")).getByRole("button", { name: "In this week" })).toBeInTheDocument();

    await user.click(within(card("Chili")).getByRole("button", { name: "In this week" }));
    expect(api.removeSelection).toHaveBeenCalledWith(1);
    expect(within(card("Chili")).getByRole("button", { name: "Add to this week" })).toBeInTheDocument();
  });

  it("shows each card's ingredients, servings, and tags", async () => {
    render_();
    await screen.findAllByRole("heading", { name: "Chili", level: 3 });
    expect(card("Chili")).toHaveTextContent("3 ingredients · serves 4");
    expect(within(card("Chili")).getByText("beef")).toHaveClass("tag");
  });

  it("shows how many recipes are planned, with a way on to the next step", async () => {
    render_();
    const weekLink = await screen.findByRole("link", { name: "1 recipe this week" });
    expect(weekLink).toHaveAttribute("href", "/this-week");
    expect(weekLink.closest("p")).toHaveTextContent("2 recipes · 1 recipe this week");

    const summary = screen.getByLabelText("This week's plan");
    expect(summary).toHaveTextContent("1 recipe this week");
    expect(summary).toHaveTextContent("Ready to build a grocery list");
    expect(within(summary).getByRole("link", { name: "Review week" })).toHaveAttribute("href", "/this-week");
  });

  it("hides the plan summary when nothing is planned", async () => {
    api.listSelections.mockResolvedValue([]);
    render_();
    await screen.findByRole("heading", { name: "Chili", level: 3 });
    expect(screen.queryByLabelText("This week's plan")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /this week$/ })).not.toBeInTheDocument();
  });

  it("lists the plan beside the library, with remove, clear, and build", async () => {
    api.removeSelection.mockResolvedValue([]);
    const user = userEvent.setup();
    render_();
    const panel = await screen.findByRole("complementary", { name: "This week" });
    expect(within(panel).getByText("1 recipe · 3 ingredients before combining")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Build the grocery list" })).toHaveAttribute("href", "/groceries");
    expect(within(panel).getByRole("link", { name: "Step 1: Plan" })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Remove Chili from this week" }));
    expect(api.removeSelection).toHaveBeenCalledWith(1);
    expect(within(panel).getByText(/No recipes selected yet/)).toBeInTheDocument();
  });

  it("asks before clearing the week from the panel", async () => {
    api.clearSelections.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render_();
    const panel = await screen.findByRole("complementary", { name: "This week" });
    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(api.clearSelections).not.toHaveBeenCalled();
    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(api.clearSelections).toHaveBeenCalledOnce();
  });

  it("filters by name or tag as you type, with a no-match state", async () => {
    const user = userEvent.setup();
    render_();
    const search = await screen.findByRole("searchbox", { name: "Search recipes or tags" });
    await user.type(search, "quick");
    expect(within(grid()).queryByRole("heading", { name: "Chili" })).not.toBeInTheDocument();
    expect(within(grid()).getByRole("heading", { name: "Tacos" })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "lasagna");
    expect(screen.getByText("No recipes match “lasagna”.")).toBeInTheDocument();
  });

  it("points an empty library to importing or typing in a recipe", async () => {
    api.listRecipes.mockResolvedValue([]);
    api.listSelections.mockResolvedValue([]);
    render_();
    expect(await screen.findByText("Your recipe library is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import a recipe" })).toHaveAttribute("href", "/recipes/import");
    expect(screen.getByRole("link", { name: "Type one in" })).toHaveAttribute("href", "/recipes/new");
    const steps = screen.getByRole("list");
    expect(steps).toHaveTextContent("Add recipes");
    expect(steps).toHaveTextContent("Plan the week");
    expect(steps).toHaveTextContent("Fill the Fry’s cart");
  });
});
