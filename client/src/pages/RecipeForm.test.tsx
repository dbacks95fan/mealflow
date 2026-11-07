// ABOUTME: RecipeForm — ingredient row add/remove and save validation.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createRecipe = vi.fn();
const getRecipe = vi.fn();
vi.mock("../lib/api", () => ({
  createRecipe: (...args: unknown[]) => createRecipe(...args),
  updateRecipe: vi.fn(),
  getRecipe: (id: number) => getRecipe(id),
}));

import { RecipeForm } from "./RecipeForm";

function renderNew() {
  return render(
    <MemoryRouter initialEntries={["/recipes/new"]}>
      <Routes>
        <Route path="/recipes/new" element={<RecipeForm />} />
        <Route path="/recipes/:id" element={<div>saved recipe</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/recipes/7/edit"]}>
      <Routes>
        <Route path="/recipes/:id/edit" element={<RecipeForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RecipeForm", () => {
  beforeEach(() => {
    createRecipe.mockReset();
    getRecipe.mockReset();
  });

  it("waits for the saved recipe before showing the edit form", async () => {
    let resolve: (r: unknown) => void = () => {};
    getRecipe.mockReturnValue(new Promise((r) => (resolve = r)));
    renderEdit();

    expect(screen.getByText("Loading recipe…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Recipe name")).not.toBeInTheDocument();

    resolve({ id: 7, name: "Pancakes", servings: 4, tags: [], ingredients: [] });
    expect(await screen.findByLabelText("Recipe name")).toHaveValue("Pancakes");
  });

  it("reports a failed load instead of showing an empty edit form", async () => {
    getRecipe.mockRejectedValue(new Error("Recipe not found"));
    renderEdit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Recipe not found");
    expect(screen.queryByLabelText("Recipe name")).not.toBeInTheDocument();
  });

  it("adds and removes ingredient rows without touching the others", async () => {
    const user = userEvent.setup();
    renderNew();

    await user.type(screen.getByLabelText("Ingredient 1 name"), "flour");
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await user.type(screen.getByLabelText("Ingredient 2 name"), "sugar");

    await user.click(screen.getByRole("button", { name: "Remove ingredient 1" }));

    expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue("sugar");
    expect(screen.queryByLabelText("Ingredient 2 name")).not.toBeInTheDocument();
  });

  it("refuses to save without a name", async () => {
    const user = userEvent.setup();
    renderNew();
    await user.type(screen.getByLabelText("Ingredient 1 name"), "flour");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/name is required/i);
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("refuses to save without at least one ingredient", async () => {
    const user = userEvent.setup();
    renderNew();
    await user.type(screen.getByLabelText("Recipe name"), "Water");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/at least one ingredient/i);
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("submits a structured payload and navigates to the saved recipe", async () => {
    createRecipe.mockResolvedValue({ id: 7 });
    const user = userEvent.setup();
    renderNew();

    await user.type(screen.getByLabelText("Recipe name"), "Toast");
    await user.type(screen.getByLabelText("Ingredient 1 name"), "bread");
    await user.type(screen.getByLabelText("Ingredient 1 quantity"), "2");
    await user.type(screen.getByLabelText("Ingredient 1 unit"), "slice");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(createRecipe).toHaveBeenCalledWith({
      name: "Toast",
      servings: null,
      tags: [],
      ingredients: [{ name: "bread", quantity: 2, unit: "slice", note: null }],
    });
    expect(await screen.findByText("saved recipe")).toBeInTheDocument();
  });
});
