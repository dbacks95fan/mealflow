// ABOUTME: Verifies the shared switch reports and toggles its state and can be
// ABOUTME: disabled.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Switch } from "./Switch";

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return <Switch label="Hide what I have" checked={on} onChange={setOn} disabled={disabled} />;
}

describe("Switch", () => {
  it("toggles its checked state", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const sw = screen.getByRole("switch", { name: "Hide what I have" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("can be disabled", () => {
    render(<Harness disabled />);
    expect(screen.getByRole("switch", { name: "Hide what I have" })).toBeDisabled();
  });
});
