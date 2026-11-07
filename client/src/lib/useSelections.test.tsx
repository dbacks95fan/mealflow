// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: useSelections — inside a SelectionsProvider every caller shares one
// ABOUTME: list, so a change on a page updates the navigation badge too.
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listSelections = vi.fn();
const addSelection = vi.fn();
vi.mock("./api", () => ({
  listSelections: () => listSelections(),
  addSelection: (id: number) => addSelection(id),
  removeSelection: vi.fn(),
  clearSelections: vi.fn(),
}));

import { SelectionsProvider } from "../components/SelectionsProvider";
import { useSelections } from "./useSelections";

const selection = (recipeId: number) => ({ recipeId, name: `Recipe ${recipeId}`, ingredientCount: 1, servings: null });

function Count({ label }: { label: string }) {
  const { selections } = useSelections();
  return (
    <p>
      {label}: {selections?.length ?? "…"}
    </p>
  );
}

function AddButton() {
  const { toggle } = useSelections();
  return (
    <button type="button" onClick={() => void toggle(2)}>
      add
    </button>
  );
}

describe("useSelections", () => {
  beforeEach(() => {
    listSelections.mockReset();
    addSelection.mockReset();
  });

  it("shares one list between callers inside a provider", async () => {
    listSelections.mockResolvedValue([selection(1)]);
    addSelection.mockResolvedValue([selection(1), selection(2)]);
    render(
      <SelectionsProvider>
        <Count label="badge" />
        <Count label="page" />
        <AddButton />
      </SelectionsProvider>,
    );
    expect(await screen.findByText("badge: 1")).toBeInTheDocument();
    expect(listSelections).toHaveBeenCalledTimes(1);

    await act(async () => screen.getByRole("button", { name: "add" }).click());
    expect(screen.getByText("badge: 2")).toBeInTheDocument();
    expect(screen.getByText("page: 2")).toBeInTheDocument();
  });

  it("loads its own list when there is no provider", async () => {
    listSelections.mockResolvedValue([selection(1), selection(2)]);
    render(<Count label="alone" />);
    expect(await screen.findByText("alone: 2")).toBeInTheDocument();
  });
});
