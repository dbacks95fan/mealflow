// ABOUTME: FrysReview — match listing, brand change persistence, cart report,
// ABOUTME: and pack-count suggestion, manual review, and Reviewed states.
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { api } = vi.hoisted(() => ({
  api: {
    getFrysMatch: vi.fn(),
    getFrysStatus: vi.fn(),
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
  imageUrl: null as string | null,
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

const totalLine = () => screen.getByText("Estimated total").parentElement!;

async function chooseProduct(user: ReturnType<typeof userEvent.setup>, brand: RegExp) {
  await user.click(screen.getByRole("button", { name: /Change product/ }));
  await user.click(screen.getByRole("radio", { name: brand }));
}

const CHEESE_REASON =
  "Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically. Set the quantity yourself.";
const manualFit: Fit = { status: "manual", reason: CHEESE_REASON };
const beefFit: Fit = { status: "suggested", packs: 2, needed: "3.5 lb", perPack: "3 lb" };

describe("FrysReview", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getFrysStatus.mockResolvedValue({ configured: true, connected: true, connectedAt: null, locationId: "1", locationName: "Fry's Central" });
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

    expect(await screen.findByText("Estimated total")).toBeInTheDocument();
    expect(totalLine()).toHaveTextContent("Estimated total $3.49");
    await chooseProduct(user, /Brand B/);
    expect(api.saveFrysMatch).toHaveBeenCalledWith(
      "rice",
      expect.objectContaining({ productId: "b", brand: "Brand B" }),
    );
  });

  it("reports a partial cart failure without claiming full success", async () => {
    api.getFrysMatch.mockResolvedValue({
      currency: "USD",
      total: 0,
      lines: [
        line("rice", [product("a", "Brand A", 3.49)], 1),
        { ...line("beans", [product("b", "Brand B", 1.99)], 1) },
        { ...line("unicorn dust", [], 1), chosen: null, unmatched: true },
      ],
    });
    api.submitFrysCart.mockResolvedValue({
      added: ["Brand A rice"],
      failed: [{ name: "Brand B rice", reason: "invalid upc" }],
      allSucceeded: false,
    });
    const user = userEvent.setup();
    render_();

    await user.click(await screen.findByRole("button", { name: "Add 2 items to Fry’s cart" }));
    expect(api.submitFrysCart).toHaveBeenCalledWith([
      { upc: "upc-a", quantity: 1, name: "Brand A rice" },
      { upc: "upc-b", quantity: 1, name: "Brand B rice" },
    ]);
    const heading = await screen.findByRole("heading", { name: "1 of 2 items added to your Fry’s cart" });
    expect(heading).toHaveFocus();
    expect(heading.closest("[role=status]")).toHaveTextContent("Not everything made it.");
    const failed = screen.getByRole("region", { name: "Failed items" });
    expect(failed).toHaveTextContent("1 item failed");
    expect(failed).toHaveTextContent("Brand B rice: invalid upc");
    expect(screen.getByRole("region", { name: "Items not sent" })).toHaveTextContent(
      "unicorn dust. Add it yourself in the Fry’s app.",
    );
  });

  describe("pack counts (INT-MF-0004)", () => {
    it("starts at the suggested pack count and shows the math", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", [product("a", "Brand A", 9.99, beefFit, "3 lb")], 2)] });
      render_();
      expect(await screen.findByText("Suggested 2 packs")).toBeInTheDocument();
      expect(screen.getByText("3.5 lb needed ÷ 3 lb per pack, rounded up.")).toBeInTheDocument();
      expect(within(screen.getByRole("group", { name: "ground beef quantity" })).getByText("2")).toBeInTheDocument();
      expect(totalLine()).toHaveTextContent("Estimated total $19.98");
    });

    it("lets the household change a suggestion, and offers to go back to it", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", [product("a", "Brand A", 9.99, beefFit, "3 lb")], 2)] });
      const user = userEvent.setup();
      render_();
      await user.click(await screen.findByRole("button", { name: "Increase ground beef quantity" }));
      expect(screen.getByText(/Changed from the suggested 2/)).toBeInTheDocument();
      expect(totalLine()).toHaveTextContent("Estimated total $29.97");

      await user.click(screen.getByRole("button", { name: "Use suggestion" }));
      expect(screen.queryByText(/Changed from the suggested/)).not.toBeInTheDocument();
      expect(totalLine()).toHaveTextContent("Estimated total $19.98");
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
      expect(totalLine()).toHaveTextContent("Estimated total $11.00");
    });

    it("resets the quantity to the new product's suggestion when the product changes", async () => {
      const options = [product("a", "Brand A", 9.99, beefFit, "3 lb"), product("b", "Brand B", 4, { status: "suggested", packs: 4, needed: "3.5 lb", perPack: "1 lb" }, "1 lb")];
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", options, 2)] });
      api.saveFrysMatch.mockResolvedValue({});
      const user = userEvent.setup();
      render_();
      await user.click(await screen.findByRole("button", { name: "Increase ground beef quantity" }));
      await chooseProduct(user, /Brand B/);
      // The open product list repeats each fit, so read the item's own line.
      expect(screen.getByText("Suggested 4 packs", { selector: "p.fit-suggested" })).toBeInTheDocument();
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

      await chooseProduct(user, /Brand B/);
      expect(screen.getByRole("note")).toHaveTextContent(/^Manual review\. Recipe needs 3 cup, pack is 16 oz/);
      expect(within(screen.getByRole("group", { name: "cheese quantity" })).getByText("1")).toBeInTheDocument();
      expect(screen.getByText(/1 item needs manual review/)).toBeInTheDocument();
    });
  });

  describe("review screen on a phone (INT-MF-0005)", () => {
    const withPhoto = (p: ReturnType<typeof product>, url: string) => ({ ...p, imageUrl: url });

    it("shows the chosen product's photo, brand, description, size, and price", async () => {
      const chosen = withPhoto(product("a", "Brand A", 3.49, ONE_PACK, "1 lb"), "https://www.kroger.com/product/images/medium/front/0001");
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("rice", [chosen], 1)] });
      render_();
      const img = await screen.findByRole("img", { name: "Brand A · Brand A rice · 1 lb" });
      expect(img).toHaveAttribute("src", "https://www.kroger.com/product/images/medium/front/0001");
      const card = img.closest("li")!;
      expect(within(card).getByText("Brand A", { selector: ".frys-brand" })).toBeInTheDocument();
      expect(card).toHaveTextContent("Brand A rice");
      expect(card).toHaveTextContent("· 1 lb");
      expect(card).toHaveTextContent("$3.49");
      expect(card).toHaveTextContent("Need 3 cup");
    });

    it("shows a labeled placeholder when Fry's has no photo", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("rice", [product("a", "Brand A", 3.49)], 1)] });
      render_();
      expect(await screen.findByRole("img", { name: "No photo for Brand A · Brand A rice · 1 lb" })).toBeInTheDocument();
    });

    it("falls back to the placeholder when a photo fails to load", async () => {
      const chosen = withPhoto(product("a", "Brand A", 3.49), "https://www.kroger.com/broken.jpg");
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("rice", [chosen], 1)] });
      render_();
      const img = await screen.findByRole("img", { name: "Brand A · Brand A rice · 1 lb" });
      fireEvent.error(img);
      expect(screen.getByRole("img", { name: "No photo for Brand A · Brand A rice · 1 lb" })).toBeInTheDocument();
    });

    it("shows the line price × quantity once the quantity is above 1", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", [product("a", "Brand A", 9.99, beefFit, "3 lb")], 2)] });
      render_();
      expect(await screen.findByText(/× 2 = \$19\.98/)).toBeInTheDocument();
    });

    it("lets the household compare options with the same details and pick one", async () => {
      const options = [
        withPhoto(product("a", "Brand A", 9.99, beefFit, "3 lb"), "https://www.kroger.com/a.jpg"),
        product("b", "Brand B", 4.19, manualFit, "8 oz"),
      ];
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("ground beef", options, 2)] });
      api.saveFrysMatch.mockResolvedValue({});
      const user = userEvent.setup();
      render_();
      const toggle = await screen.findByRole("button", { name: "Change product (2 options)" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");

      const group = screen.getByRole("group", { name: "Choose a product for ground beef" });
      const a = within(group).getByRole("radio", { name: /Brand A · Brand A rice · 3 lb/ });
      const b = within(group).getByRole("radio", { name: /Brand B · Brand B rice · 8 oz/ });
      expect(a).toBeChecked();
      expect(a.closest("label")).toHaveTextContent("Suggested 2 packs");
      expect(a.closest("label")).toHaveTextContent("$9.99");
      expect(b.closest("label")).toHaveTextContent("Needs manual review");
      expect(b.closest("label")).toHaveTextContent("$4.19");
      expect(within(group).getAllByRole("img")).toHaveLength(2);

      await user.click(b);
      expect(b).toBeChecked();
      expect(api.saveFrysMatch).toHaveBeenCalledWith("ground beef", expect.objectContaining({ productId: "b" }));
      expect(totalLine()).toHaveTextContent("Estimated total $4.19");
    });

    it("says when only one match was found", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("rice", [product("a", "Brand A", 3.49)], 1)] });
      render_();
      expect(await screen.findByText("Only one match found.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Change product/ })).not.toBeInTheDocument();
    });

    it("marks a remembered choice until the household picks another product", async () => {
      const options = [product("a", "Brand A", 3.49), product("b", "Brand B", 4.19)];
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [{ ...line("rice", options, 1), remembered: true }] });
      api.saveFrysMatch.mockResolvedValue({});
      const user = userEvent.setup();
      render_();
      expect(await screen.findByText("Remembered")).toBeInTheDocument();
      await chooseProduct(user, /Brand B/);
      expect(screen.queryByText("Remembered")).not.toBeInTheDocument();
    });

    it("clearly marks an item with no Fry's match and leaves it out of the cart count", async () => {
      api.getFrysMatch.mockResolvedValue({
        currency: "USD",
        total: 0,
        lines: [
          line("rice", [product("a", "Brand A", 3.49)], 1),
          { ...line("unicorn dust", [], 1), chosen: null, unmatched: true },
        ],
      });
      render_();
      const note = await screen.findByText("No Fry’s product found. Add this one in the Fry’s app.");
      expect(note.closest("li")).toHaveTextContent("unicorn dust");
      expect(screen.getByRole("button", { name: "Add 1 item to Fry’s cart" })).toBeInTheDocument();
    });

    it("shows the home store with a link to change it", async () => {
      api.getFrysMatch.mockResolvedValue({ currency: "USD", total: 0, lines: [line("rice", [product("a", "Brand A", 3.49)], 1)] });
      render_();
      expect(await screen.findByText("Fry's Central")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Change store" })).toHaveAttribute("href", "/settings");
      expect(screen.getByRole("link", { name: "Back to grocery list" })).toHaveAttribute("href", "/groceries");
    });
  });
});
