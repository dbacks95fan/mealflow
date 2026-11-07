// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: CartResult (INT-MF-0006) — counts, failures with reasons, unmatched
// ABOUTME: items listed apart, the added list, and never claiming complete
// ABOUTME: success on a partial result.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CartResult } from "./CartResult";

const submitted = [
  { name: "Brand A beef", quantity: 2 },
  { name: "Brand A rice", quantity: 1 },
];

function renderResult(props: Partial<Parameters<typeof CartResult>[0]> = {}) {
  const onBack = vi.fn();
  render(
    <MemoryRouter>
      <CartResult
        result={{ added: ["Brand A beef", "Brand A rice"], failed: [], allSucceeded: true }}
        submitted={submitted}
        unmatched={[]}
        onBack={onBack}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onBack };
}

describe("CartResult", () => {
  it("states how many submitted items were added, with no caveat on full success", () => {
    renderResult();
    const heading = screen.getByRole("heading", { name: "2 of 2 items added to your Fry’s cart" });
    expect(heading).toHaveFocus();
    expect(screen.queryByText(/Not everything made it/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Failed items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Items not sent" })).not.toBeInTheDocument();
  });

  it("lists each failed item with Fry's reason and never reads as complete success", () => {
    renderResult({
      result: {
        added: ["Brand A rice"],
        failed: [{ name: "Brand A beef", reason: "Fry's said the item is unavailable" }],
        allSucceeded: false,
      },
    });
    expect(screen.getByRole("heading", { name: "1 of 2 items added to your Fry’s cart" })).toBeInTheDocument();
    expect(screen.getByText(/Not everything made it/)).toBeInTheDocument();
    const failed = screen.getByRole("region", { name: "Failed items" });
    expect(failed).toHaveTextContent("1 item failed");
    expect(failed).toHaveTextContent("Brand A beef: Fry's said the item is unavailable");
  });

  it("lists items with no Fry's match separately as not sent, and treats that as partial", () => {
    renderResult({ unmatched: ["unicorn dust", "dragon fruit"] });
    expect(screen.getByRole("heading", { name: "2 of 2 items added to your Fry’s cart" })).toBeInTheDocument();
    expect(screen.getByText(/Not everything made it/)).toBeInTheDocument();
    const notSent = screen.getByRole("region", { name: "Items not sent" });
    expect(notSent).toHaveTextContent("2 items had no Fry’s match");
    expect(notSent).toHaveTextContent("unicorn dust. Add it yourself in the Fry’s app.");
    expect(notSent).toHaveTextContent("dragon fruit. Add it yourself in the Fry’s app.");
  });

  it("collapses the added items, with each quantity, behind a toggle", async () => {
    const user = userEvent.setup();
    renderResult();
    const toggle = screen.getByRole("button", { name: /2 items added/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("× 2")).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Brand A beef").closest("li")).toHaveTextContent("× 2");
  });

  it("says checkout happens in Fry's, and offers a way back to the products", async () => {
    const user = userEvent.setup();
    const { onBack } = renderResult();
    expect(screen.getByText("Checkout happens in the Fry’s app or website. MealFlow only fills the cart.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to products" }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Done" })).toHaveAttribute("href", "/");
  });

  it("reports zero added when everything failed", () => {
    renderResult({
      result: {
        added: [],
        failed: submitted.map((s) => ({ name: s.name, reason: "invalid upc" })),
        allSucceeded: false,
      },
    });
    expect(screen.getByRole("heading", { name: "0 of 2 items added to your Fry’s cart" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /added/ })).not.toBeInTheDocument();
  });
});
