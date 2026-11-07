// ABOUTME: FrysReview — match listing, brand change persistence, cart report,
// ABOUTME: and pack-count suggestion, manual review, and Reviewed states.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { api } = vi.hoisted(() => ({
  api: {
    getFrysMatch: vi.fn(),
    saveFrysMatch: vi.fn(),
    submitFrysCart: vi.fn(),
  },
}));
vi.mock("../lib/api", () => api);

import { FrysReview } from "./FrysReview";

const render_ = () =>
  render(
    <MemoryRouter>
      <FrysReview />
    </MemoryRouter>,
  );

type Fit =
  | { status: "suggested"; packs: number; needed: string; perPack: string }
  | { status: "manual"; reason: string };

const ONE_PACK: Fit = { status: "suggested", packs: 1, needed: "1 lb", perPack: "1 lb" };

const product = (id: string, brand: string, price: number, fit: Fit = ONE_PACK, size = "1 lb") => ({
  productId: id,
  upc: `upc-${id}`,
  description: `${brand} rice`,
  brand,
  size,
  price,
  imageUrl: null,
  fit,
});

const line = (name: string, options: ReturnType<typeof product>[], neededQuantity: number) => ({
  normalizedName: name,
  name,
  quantities: [{ quantity: 3, unit: "cup" }],
  neededQuantity,
  remembered: false,
  chosen: options[0],
  options,
  unmatched: false,
});

const CHEESE_REASON =
  "Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically. Set the quantity yourself.";
const manualFit: Fit = { status: "manual", reason: CHEESE_REASON };
const beefFit: Fit = { status: "suggested", packs: 2, needed: "3.5 lb", perPack: "3 lb" };

describe("FrysReview", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("shows the connection hint when matching is not ready", async () => {
    api.getFrysMatch.mockRejectedValue(new Error("Choose a Fry's store first."));
    render_();
    expect(await screen.findByRole("alert")).toHaveTextContent(/choose a fry.s store/i);
    expect(screen.getByRole("link", { name: /connection and store/i })).toBeInTheDocument();
  });

  it("lists matches with a total and persists a brand change", async () => {
    api.getFrysMatch.mockResolvedValue({
      currency: "USD",
      total: 3.49,
      lines: [
        {
          normalizedName: "rice",
          name: "rice",
          quantities: [{ quantity: 2, unit: "cup" }],
          neededQuantity: 1,
          remembered: false,
          chosen: product("a", "Brand A", 3.49),
          options: [product("a", "Brand A", 3.49), product("b", "Brand B", 4.19)],
          unmatched: false,
        },
      ],
    });
    api.saveFrysMatch.mockResolvedValue({});
    const user = userEvent.setup();
    render_();

    expect(await screen.findByText(/Estimated total: \$3\.49/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "b");
    expect(api.saveFrysMatch).toHaveBeenCalledWith(
      "rice",
      expect.objectContaining({ productId: "b", brand: "Brand B" }),
    );
  });

  it("reports a partial cart failure without claiming full success", async () => {
    api.getFrysMatch.mockResolvedValue({
      currency: "USD",
      total: 3.49,
      lines: [
        {
          normalizedName: "rice",
          name: "rice",
          quantities: [],
          neededQuantity: 1,
          remembered: false,
          chosen: product("a", "Brand A", 3.49),
          options: [product("a", "Brand A", 3.49)],
          unmatched: false,
        },
      ],
    });
    api.submitFrysCart.mockResolvedValue({
      added: ["Brand A rice"],
      failed: [{ name: "Beans", reason: "invalid upc" }],
      allSucceeded: false,
    });
    const user = userEvent.setup();
    render_();

    await user.click(await screen.findByRole("button", { name: "Add to Fry’s" }));
    // Each quantity stepper is also a status region, so pick the cart result.
    const status = (await screen.findAllByRole("status")).find((el) => /added to your Fry/.test(el.textContent ?? ""))!;
    expect(status).toHaveTextContent(/1 item added/i);
    expect(status).toHaveTextContent(/1 failed/i);
    expect(within(status).getByText(/Beans: invalid upc/)).toBeInTheDocument();
  });

  describe("pack counts (INT-MF-0004)", () => {
    it("starts at the suggested pack count and shows the math", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", [product("a", "Brand A", 9.99, beefFit, "3 lb")], 2)] });
      render_();
      expect(await screen.findByText("Suggested 2 packs")).toBeInTheDocument();
      expect(screen.getByText("3.5 lb needed ÷ 3 lb per pack, rounded up.")).toBeInTheDocument();
      expect(within(screen.getByRole("group", { name: "ground beef quantity" })).getByText("2")).toBeInTheDocument();
      expect(screen.getByText(/Estimated total: \$19\.98/)).toBeInTheDocument();
    });

    it("lets the household change a suggestion, and offers to go back to it", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", [product("a", "Brand A", 9.99, beefFit, "3 lb")], 2)] });
      const user = userEvent.setup();
      render_();
      await user.click(await screen.findByRole("button", { name: "Increase ground beef quantity" }));
      expect(screen.getByText(/Changed from the suggested 2/)).toBeInTheDocument();
      expect(screen.getByText(/Estimated total: \$29\.97/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Use suggestion" }));
      expect(screen.queryByText(/Changed from the suggested/)).not.toBeInTheDocument();
      expect(screen.getByText(/Estimated total: \$19\.98/)).toBeInTheDocument();
    });

    it("marks an unconvertible item for manual review at a quantity of 1", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("cheese", [product("a", "Brand A", 4, manualFit, "8 oz")], 1)] });
      render_();
      const note = await screen.findByRole("note");
      expect(note).toHaveTextContent(`Manual review. ${CHEESE_REASON}`);
      expect(note.closest("li")).toHaveClass("needs-review");
      expect(screen.getByText(/1 item needs manual review before you add it/)).toBeInTheDocument();
      expect(within(screen.getByRole("group", { name: "cheese quantity" })).getByText("1")).toBeInTheDocument();
    });

    it("changes a manual review item to Reviewed once the household sets its quantity", async () => {
      api.getFrysMatch.mockResolvedValue({
        currency: "USD",
        total: 0,
        lines: [
          line("cheese", [product("a", "Brand A", 4, manualFit, "8 oz")], 1),
          line("milk", [product("m", "Brand M", 3, manualFit, "1 gal")], 1),
        ],
      });
      const user = userEvent.setup();
      render_();
      expect(await screen.findByText(/2 items need manual review before you add them/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Increase cheese quantity" }));
      const cheeseCard = screen.getByText("cheese", { selector: "strong" }).closest("li")!;
      expect(within(cheeseCard).getByRole("note")).toHaveTextContent(
        "Reviewed. You set this quantity. Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically.",
      );
      expect(cheeseCard).not.toHaveClass("needs-review");
      expect(screen.getByText(/1 item needs manual review before you add it/)).toBeInTheDocument();
      expect(screen.getByText(/Estimated total: \$11\.00/)).toBeInTheDocument();
    });

    it("resets the quantity to the new product's suggestion when the product changes", async () => {
      const options = [product("a", "Brand A", 9.99, beefFit, "3 lb"), product("b", "Brand B", 4, { status: "suggested", packs: 4, needed: "3.5 lb", perPack: "1 lb" }, "1 lb")];
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", options, 2)] });
      api.saveFrysMatch.mockResolvedValue({});
      const user = userEvent.setup();
      render_();
      await user.click(await screen.findByRole("button", { name: "Increase ground beef quantity" }));
      await user.selectOptions(screen.getByRole("combobox"), "b");
      expect(screen.getByText("Suggested 4 packs")).toBeInTheDocument();
      expect(within(screen.getByRole("group", { name: "ground beef quantity" })).getByText("4")).toBeInTheDocument();
      expect(screen.queryByText(/Changed from the suggested/)).not.toBeInTheDocument();
    });

    it("returns a Reviewed item to manual review when another unconvertible product is chosen", async () => {
      const options = [
        product("a", "Brand A", 4, manualFit, "8 oz"),
        product("b", "Brand B", 6, { status: "manual", reason: "Recipe needs 3 cup, pack is 16 oz. Can't convert volume to weight automatically. Set the quantity yourself." }, "16 oz"),
      ];
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("cheese", options, 1)] });
      api.saveFrysMatch.mockResolvedValue({});
      const user = userEvent.setup();
      render_();
      await user.click(await screen.findByRole("button", { name: "Increase cheese quantity" }));
      expect(screen.getByRole("note")).toHaveTextContent(/^Reviewed\./);

      await user.selectOptions(screen.getByRole("combobox"), "b");
      expect(screen.getByRole("note")).toHaveTextContent(/^Manual review\. Recipe needs 3 cup, pack is 16 oz/);
      expect(within(screen.getByRole("group", { name: "cheese quantity" })).getByText("1")).toBeInTheDocument();
      expect(screen.getByText(/1 item needs manual review/)).toBeInTheDocument();
    });
  });
});
