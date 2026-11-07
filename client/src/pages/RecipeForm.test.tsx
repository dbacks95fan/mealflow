// ABOUTME: RecipeForm — ingredient row add/remove, save validation, tag chips,
// ABOUTME: reviewing an imported draft, and editing with the same form.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createRecipe = vi.fn();
const getRecipe = vi.fn();
const updateRecipe = vi.fn();
vi.mock("../lib/api", () => ({
  createRecipe: (...args: unknown[]) => createRecipe(...args),
  updateRecipe: (...args: unknown[]) => updateRecipe(...args),
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
    updateRecipe.mockReset();
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

  it("refuses to save a quantity that isn't a number", async () => {
    const user = userEvent.setup();
    renderNew();
    await user.type(screen.getByLabelText("Recipe name"), "Toast");
    await user.type(screen.getByLabelText("Ingredient 1 name"), "bread");
    await user.type(screen.getByLabelText("Ingredient 1 quantity"), "a few");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Ingredient quantities must be numbers.");
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("turns tags into chips that can be removed, and saves them", async () => {
    createRecipe.mockResolvedValue({ id: 7 });
    const user = userEvent.setup();
    renderNew();

    const tagInput = screen.getByLabelText("Tags (optional)");
    await user.type(tagInput, "dinner{Enter}");
    await user.type(tagInput, "quick,");
    await user.type(tagInput, "spicy");
    expect(within(screen.getByRole("list", { name: "Tags" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "dinner",
      "quick",
    ]);
    await user.click(screen.getByRole("button", { name: "Remove tag quick" }));

    await user.type(screen.getByLabelText("Recipe name"), "Toast");
    await user.type(screen.getByLabelText("Ingredient 1 name"), "bread");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    // "spicy" was still in the input; saving keeps it.
    expect(createRecipe).toHaveBeenCalledWith(expect.objectContaining({ tags: ["dinner", "spicy"] }));
  });

  it("opens an imported draft for review, saying nothing is saved yet", () => {
    const draft = {
      name: "Fetched Chili",
      servings: 6,
      ingredients: [{ name: "beans", quantity: 2, unit: "can", note: "drained" }],
    };
    render(
      <MemoryRouter initialEntries={[{ pathname: "/recipes/new", state: { draft, source: "url" } }]}>
        <Routes>
          <Route path="/recipes/new" element={<RecipeForm />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Review recipe" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Imported from a web page. Check each ingredient, then save. Nothing is saved until you do.",
    );
    expect(screen.getByLabelText("Recipe name")).toHaveValue("Fetched Chili");
    expect(screen.getByLabelText("Servings (optional)")).toHaveValue(6);
    expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue("beans");
    expect(screen.getByLabelText("Ingredient 1 note")).toHaveValue("drained");
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("edits a saved recipe with the same form", async () => {
    getRecipe.mockResolvedValue({
      id: 7,
      name: "Pancakes",
      servings: 4,
      tags: ["breakfast"],
      ingredients: [{ id: 1, name: "flour", quantity: 2, unit: "cup", note: null, position: 0 }],
    });
    updateRecipe.mockResolvedValue({ id: 7 });
    const user = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("heading", { name: "Edit recipe" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tags" })).toHaveTextContent("breakfast");
    expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue("flour");
    expect(screen.getByRole("button", { name: "Add ingredient" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Recipe name"));
    await user.type(screen.getByLabelText("Recipe name"), "Waffles");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(updateRecipe).toHaveBeenCalledWith(7, {
      name: "Waffles",
      servings: 4,
      tags: ["breakfast"],
      ingredients: [{ name: "flour", quantity: 2, unit: "cup", note: null }],
    });
  });
});
