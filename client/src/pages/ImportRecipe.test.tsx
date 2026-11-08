// ABOUTME: ImportRecipe ("Add a recipe") — one entry point for every source;
// ABOUTME: each import produces a draft and hands off to review.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const importText = vi.fn();
const importUrl = vi.fn();
const extractTextFromFile = vi.fn();
const navigate = vi.fn();
vi.mock("../lib/api", () => ({
  importText: (t: string) => importText(t),
  importUrl: (u: string) => importUrl(u),
}));
vi.mock("../lib/extract-file", () => ({
  extractTextFromFile: (file: File, onStatus: (s: string) => void) => extractTextFromFile(file, onStatus),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

import { ImportRecipe } from "./ImportRecipe";

const render_ = (path = "/recipes/import") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ImportRecipe />
    </MemoryRouter>,
  );

const draft = { name: "Pasted Pie", servings: null, ingredients: [] };

describe("ImportRecipe", () => {
  beforeEach(() => {
    importText.mockReset();
    importUrl.mockReset();
    extractTextFromFile.mockReset();
    navigate.mockReset();
  });

  it("offers every source from one screen, starting with a web page", () => {
    render_();
    expect(screen.getByRole("heading", { name: "Add a recipe" })).toBeInTheDocument();
    const names = screen.getAllByRole("radio").map((r) => r.closest("label")!.querySelector(".source-title")!.textContent);
    expect(names).toEqual(["From a web page", "Paste text", "Upload a file", "Type it in"]);
    expect(screen.getByRole("radio", { name: /From a web page/ })).toBeChecked();
    expect(screen.getByLabelText("Recipe page URL")).toBeInTheDocument();
  });

  it("presets the source from the link that opened it", () => {
    render_("/recipes/import?source=type");
    expect(screen.getByRole("radio", { name: /Type it in/ })).toBeChecked();
    expect(screen.getByRole("link", { name: "Start a blank recipe" })).toHaveAttribute("href", "/recipes/new");
  });

  it("extracts pasted text and navigates to review with the draft", async () => {
    importText.mockResolvedValue(draft);
    const user = userEvent.setup();
    render_();

    await user.click(screen.getByRole("radio", { name: /Paste text/ }));
    await user.type(screen.getByLabelText(/paste the recipe text/i), "Pasted Pie");
    await user.click(screen.getByRole("button", { name: /extract ingredients/i }));

    expect(importText).toHaveBeenCalledWith("Pasted Pie");
    expect(navigate).toHaveBeenCalledWith("/recipes/new", { state: { draft, source: "paste" } });
  });

  it("fetches a web page and navigates to review", async () => {
    importUrl.mockResolvedValue(draft);
    const user = userEvent.setup();
    render_();

    await user.type(screen.getByLabelText("Recipe page URL"), "https://example.com/pie");
    await user.click(screen.getByRole("button", { name: "Fetch recipe" }));

    expect(importUrl).toHaveBeenCalledWith("https://example.com/pie");
    expect(navigate).toHaveBeenCalledWith("/recipes/new", { state: { draft, source: "url" } });
  });

  it("reads an uploaded file and navigates to review", async () => {
    extractTextFromFile.mockResolvedValue("Pie\n1 cup flour");
    importText.mockResolvedValue(draft);
    const user = userEvent.setup();
    render_();

    await user.click(screen.getByRole("radio", { name: /Upload a file/ }));
    const input = screen.getByLabelText("Choose a .txt, .md, .pdf, or image file");
    expect(input).toHaveAttribute("accept", ".txt,.md,.pdf,image/*");
    await user.upload(input, new File(["Pie\n1 cup flour"], "pie.txt", { type: "text/plain" }));

    expect(importText).toHaveBeenCalledWith("Pie\n1 cup flour");
    expect(navigate).toHaveBeenCalledWith("/recipes/new", { state: { draft, source: "file" } });
  });

  it("surfaces an import error and does not navigate", async () => {
    importText.mockRejectedValue(new Error("Could not find a recipe on that page."));
    const user = userEvent.setup();
    render_();

    await user.click(screen.getByRole("radio", { name: /Paste text/ }));
    await user.type(screen.getByLabelText(/paste the recipe text/i), "junk");
    await user.click(screen.getByRole("button", { name: /extract ingredients/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not find a recipe/i);
    expect(navigate).not.toHaveBeenCalled();
  });
});
