// ABOUTME: Groceries — combined amounts, pantry flag, the hide-pantry view, and
// ABOUTME: the summary and match counts.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getGroceryList = vi.fn();
const listPantry = vi.fn();
const addPantryItem = vi.fn();
const removePantryItem = vi.fn();
vi.mock("../lib/api", () => ({
  getGroceryList: () => getGroceryList(),
  listPantry: () => listPantry(),
  addPantryItem: (name: string) => addPantryItem(name),
  removePantryItem: (id: number) => removePantryItem(id),
}));

import { Groceries } from "./Groceries";

const render_ = () =>
  render(
    <MemoryRouter>
      <Groceries />
    </MemoryRouter>,
  );

const line = (over: Record<string, unknown> = {}) => ({
  name: "flour",
  normalizedName: "flour",
  quantities: [{ quantity: 3, unit: "cup" }],
  contributions: [{ recipeId: 1, recipeName: "Bread", quantity: 3, unit: "cup" }],
  inPantry: false,
  ...over,
});

describe("Groceries", () => {
  beforeEach(() => {
    getGroceryList.mockReset();
    listPantry.mockReset();
    addPantryItem.mockReset();
    removePantryItem.mockReset();
    listPantry.mockResolvedValue([]);
  });

  it("prompts to select recipes when nothing is planned", async () => {
    getGroceryList.mockResolvedValue({ lines: [], recipeCount: 0 });
    render_();
    expect(await screen.findByText(/no recipes selected/i)).toBeInTheDocument();
  });

  it("shows combined amounts and provenance", async () => {
    getGroceryList.mockResolvedValue({ lines: [line()], recipeCount: 1 });
    render_();
    expect(await screen.findByText("flour")).toBeInTheDocument();
    expect(screen.getByText("3 cup")).toBeInTheDocument();
    expect(screen.getByText("From Bread")).toBeInTheDocument();
  });

  it("hides pantry items when the toggle is on", async () => {
    getGroceryList.mockResolvedValue({
      lines: [line(), line({ name: "salt", normalizedName: "salt", inPantry: true })],
      recipeCount: 1,
    });
    const user = userEvent.setup();
    render_();

    expect(await screen.findByText("salt")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Hide what I have" }));
    expect(screen.queryByText("salt")).not.toBeInTheDocument();
    expect(screen.getByText("flour")).toBeInTheDocument();
  });

  it("adds a line to the pantry", async () => {
    getGroceryList.mockResolvedValue({ lines: [line()], recipeCount: 1 });
    addPantryItem.mockResolvedValue([{ id: 9, name: "flour", normalizedName: "flour", createdAt: "" }]);
    const user = userEvent.setup();
    render_();

    await user.click(await screen.findByRole("button", { name: "Have it: flour", pressed: false }));
    expect(addPantryItem).toHaveBeenCalledWith("flour");
  });

  it("takes a line back out of the pantry", async () => {
    getGroceryList.mockResolvedValue({ lines: [line({ inPantry: true })], recipeCount: 1 });
    listPantry.mockResolvedValue([{ id: 9, name: "flour", normalizedName: "flour", createdAt: "" }]);
    removePantryItem.mockResolvedValue([]);
    const user = userEvent.setup();
    render_();

    const button = await screen.findByRole("button", { name: "Have it: flour", pressed: true });
    expect(button).toHaveTextContent("Have it");
    await user.click(button);
    expect(removePantryItem).toHaveBeenCalledWith(9);
  });

  it("shows how many items are listed and in the pantry, and how many go to Fry's", async () => {
    getGroceryList.mockResolvedValue({
      lines: [
        line(),
        line({ name: "sugar", normalizedName: "sugar" }),
        line({ name: "salt", normalizedName: "salt", inPantry: true }),
      ],
      recipeCount: 2,
    });
    render_();
    expect(await screen.findByText("3 items")).toBeInTheDocument();
    expect(screen.getByText("3 items").closest("p")).toHaveTextContent("3 items · 1 in pantry");
    expect(screen.getByRole("link", { name: "Match 2 items to Fry’s" })).toHaveAttribute("href", "/frys");
    expect(screen.getByText("Items you already have are skipped.")).toBeInTheDocument();
  });

  it("dims pantry rows and marks the toggle as pressed", async () => {
    getGroceryList.mockResolvedValue({
      lines: [line(), line({ name: "salt", normalizedName: "salt", inPantry: true })],
      recipeCount: 1,
    });
    render_();
    const salt = await screen.findByRole("button", { name: "Have it: salt" });
    expect(salt).toHaveAttribute("aria-pressed", "true");
    expect(salt.closest("li")).toHaveClass("in-pantry");
    expect(screen.getByRole("button", { name: "Have it: flour" }).closest("li")).not.toHaveClass("in-pantry");
  });

  it("disables matching when everything is in the pantry", async () => {
    getGroceryList.mockResolvedValue({ lines: [line({ inPantry: true })], recipeCount: 1 });
    render_();
    expect(await screen.findByRole("button", { name: "Match 0 items to Fry’s" })).toBeDisabled();
  });
});
