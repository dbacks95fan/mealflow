// ABOUTME: Verifies the shared quantity stepper changes value, respects its
// ABOUTME: bounds through disabled states, and exposes accessible labels.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

function Harness({ start = 2, min, max }: { start?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(start);
  return <QuantityStepper label="Chicken breast" value={value} onChange={setValue} min={min} max={max} />;
}

describe("QuantityStepper", () => {
  it("increases and decreases the value", async () => {
    const user = userEvent.setup();
    render(<Harness start={2} />);
    await user.click(screen.getByRole("button", { name: "Increase Chicken breast quantity" }));
    expect(screen.getByRole("status")).toHaveTextContent("3");
    await user.click(screen.getByRole("button", { name: "Decrease Chicken breast quantity" }));
    await user.click(screen.getByRole("button", { name: "Decrease Chicken breast quantity" }));
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("disables decrease at the minimum and increase at the maximum", () => {
    const { unmount } = render(<Harness start={1} min={1} />);
    expect(screen.getByRole("button", { name: "Decrease Chicken breast quantity" })).toBeDisabled();
    unmount();
    render(<Harness start={5} max={5} />);
    expect(screen.getByRole("button", { name: "Increase Chicken breast quantity" })).toBeDisabled();
  });

  it("groups the controls under the item name", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Chicken breast quantity" })).toBeInTheDocument();
  });
});
