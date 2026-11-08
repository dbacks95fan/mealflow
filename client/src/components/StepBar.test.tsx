// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: StepBar — the current step is marked, earlier steps read as done, and
// ABOUTME: every step links to its screen so the household can go back.
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StepBar, type Step } from "./StepBar";

const renderAt = (current: Step) =>
  render(
    <MemoryRouter>
      <StepBar current={current} />
    </MemoryRouter>,
  );

describe("StepBar", () => {
  it("links every step to its screen", () => {
    renderAt(1);
    expect(screen.getByRole("link", { name: /plan/i })).toHaveAttribute("href", "/this-week");
    expect(screen.getByRole("link", { name: /list/i })).toHaveAttribute("href", "/groceries");
    expect(screen.getByRole("link", { name: /fry.s cart/i })).toHaveAttribute("href", "/frys");
  });

  it("marks only the current step", () => {
    renderAt(2);
    const current = screen.getByRole("link", { current: "step" });
    expect(current).toHaveAccessibleName("Step 2: List");
    expect(screen.getAllByRole("link").filter((l) => l.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("marks earlier steps as done and later steps as not done", () => {
    renderAt(3);
    expect(screen.getByRole("link", { name: "Step 1: Plan (done)" })).toHaveClass("done");
    expect(screen.getByRole("link", { name: "Step 2: List (done)" })).toHaveClass("done");
    expect(screen.getByRole("link", { name: "Step 3: Fry’s cart" })).toHaveClass("current");
  });

  it("leaves steps after the current one unmarked", () => {
    renderAt(1);
    expect(screen.getByRole("link", { name: "Step 2: List" })).not.toHaveClass("done");
    expect(screen.getByRole("link", { name: "Step 3: Fry’s cart" })).not.toHaveClass("current");
  });
});
