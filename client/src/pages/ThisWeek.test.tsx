// ABOUTME: ThisWeek — empty state, listing selections, remove, and clear.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listSelections = vi.fn();
const removeSelection = vi.fn();
const clearSelections = vi.fn();
vi.mock("../lib/api", () => ({
  listSelections: () => listSelections(),
  addSelection: vi.fn(),
  removeSelection: (id: number) => removeSelection(id),
  clearSelections: () => clearSelections(),
}));

import { ThisWeek } from "./ThisWeek";

const render_ = () =>
  render(
    <MemoryRouter>
      <ThisWeek />
    </MemoryRouter>,
  );

describe("ThisWeek", () => {
  beforeEach(() => {
    listSelections.mockReset();
    removeSelection.mockReset();
    clearSelections.mockReset();
  });

  it("explains how to select a recipe when the list is empty", async () => {
    listSelections.mockResolvedValue([]);
    render_();
    expect(await screen.findByText(/no recipes selected/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse recipes" })).toHaveAttribute("href", "/");
  });

  it("lists selected recipes and removes one", async () => {
    listSelections.mockResolvedValue([
      { recipeId: 1, name: "Chili", servings: 4, ingredientCount: 6, addedAt: "" },
      { recipeId: 2, name: "Tacos", servings: null, ingredientCount: 5, addedAt: "" },
    ]);
    removeSelection.mockResolvedValue([
      { recipeId: 2, name: "Tacos", servings: null, ingredientCount: 5, addedAt: "" },
    ]);
    const user = userEvent.setup();
    render_();

    expect(await screen.findByRole("heading", { name: "Chili" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Chili from this week" }));

    expect(removeSelection).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("heading", { name: "Chili" })).not.toBeInTheDocument();
  });

  it("clears the week only after confirmation", async () => {
    listSelections.mockResolvedValue([
      { recipeId: 1, name: "Chili", servings: 4, ingredientCount: 6, addedAt: "" },
    ]);
    clearSelections.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render_();

    await user.click(await screen.findByRole("button", { name: "Clear the week" }));
    expect(clearSelections).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Confirm clearing the week" })).toHaveTextContent(
      "Clear every selected recipe? Recipes stay in your library. Only this week’s plan is cleared.",
    );
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(clearSelections).toHaveBeenCalledOnce();
  });

  it("keeps the week when the household cancels clearing", async () => {
    listSelections.mockResolvedValue([
      { recipeId: 1, name: "Chili", servings: 4, ingredientCount: 6, addedAt: "" },
    ]);
    const user = userEvent.setup();
    render_();

    await user.click(await screen.findByRole("button", { name: "Clear the week" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(clearSelections).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Chili" })).toBeInTheDocument();
  });

  it("summarizes the week and links each recipe, the library, and the next step", async () => {
    listSelections.mockResolvedValue([
      { recipeId: 1, name: "Chili", servings: 4, ingredientCount: 6, addedAt: "" },
      { recipeId: 2, name: "Tacos", servings: null, ingredientCount: 5, addedAt: "" },
    ]);
    render_();

    expect(await screen.findByText("2 recipes · 11 ingredients before combining")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chili/ })).toHaveAttribute("href", "/recipes/1");
    expect(screen.getByRole("link", { name: /Chili/ })).toHaveTextContent("6 ingredients · serves 4");
    expect(screen.getByRole("link", { name: /Add recipes from the library/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Build the grocery list" })).toHaveAttribute("href", "/groceries");
  });
});
