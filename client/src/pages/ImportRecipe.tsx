// ABOUTME: "Add a recipe" — the one entry point for every source (INT-MF-0009):
// ABOUTME: fetch from a web page, paste text, upload a .txt/.md/.pdf/image file,
// ABOUTME: or type one in. Imports produce a draft that opens in the recipe form
// ABOUTME: for review before anything is saved.
import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { importText, importUrl, type RecipeDraft } from "../lib/api";
import { extractTextFromFile } from "../lib/extract-file";

type Source = "url" | "paste" | "file" | "type";

const SOURCES: { id: Source; title: string; sub: string; icon: ReactNode }[] = [
  {
    id: "url",
    title: "From a web page",
    sub: "Paste a recipe link",
    icon: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    ),
  },
  {
    id: "paste",
    title: "Paste text",
    sub: "From a note or email",
    icon: (
      <>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4h6v3H9z" />
      </>
    ),
  },
  {
    id: "file",
    title: "Upload a file",
    sub: "PDF, text, or photo",
    icon: (
      <>
        <path d="M14 3H6v18h12V7z" />
        <path d="M14 3v4h4" />
      </>
    ),
  },
  { id: "type", title: "Type it in", sub: "Start from blank", icon: <path d="M4 20h4L19 9l-4-4L4 16z" /> },
];

function isSource(value: string | null): value is Source {
  return SOURCES.some((s) => s.id === value);
}

export function ImportRecipe() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get("source");
  const [source, setSource] = useState<Source>(isSource(requested) ? requested : "url");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runImport(from: Exclude<Source, "type">, makeDraft: () => Promise<RecipeDraft>) {
    setBusy(true);
    setError(null);
    try {
      const draft = await makeDraft();
      navigate("/recipes/new", { state: { draft, source: from } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setBusy(false);
      setStatus(null);
    }
  }

  async function handlePaste(event: FormEvent) {
    event.preventDefault();
    await runImport("paste", () => importText(text));
  }

  async function handleUrl(event: FormEvent) {
    event.preventDefault();
    await runImport("url", () => importUrl(url.trim()));
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus("Reading file…");
    await runImport("file", async () => importText(await extractTextFromFile(file, setStatus)));
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!busy) void handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="stack">
      <div className="page-title">
        <Link to="/" className="back-link" aria-label="Back to recipes">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h2>Add a recipe</h2>
      </div>
      <p className="muted">Choose how to bring it in. You will review every ingredient before anything is saved.</p>

      <fieldset className="source-picker">
        <legend className="visually-hidden">How to add the recipe</legend>
        {SOURCES.map((s) => (
          <label key={s.id} className={source === s.id ? "source-card selected" : "source-card"}>
            <input
              type="radio"
              name="source"
              value={s.id}
              checked={source === s.id}
              onChange={() => {
                setSource(s.id);
                setError(null);
              }}
            />
            <span className="source-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {s.icon}
              </svg>
            </span>
            <span className="source-text">
              <span className="source-title">{s.title}</span>
              <span className="muted">{s.sub}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {source === "url" && (
        <form onSubmit={handleUrl} className="stack">
          <label>
            Recipe page URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipes/chili"
            />
          </label>
          <p className="muted">Works best with recipe sites that publish structured recipe data.</p>
          <button type="submit" disabled={busy || url.trim() === ""}>
            {busy ? "Fetching…" : "Fetch recipe"}
          </button>
        </form>
      )}

      {source === "paste" && (
        <form onSubmit={handlePaste} className="stack">
          <label>
            Paste the recipe text
            <textarea
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Recipe name\nIngredients\n2 cups flour\n1 tsp salt\n…"}
            />
          </label>
          <button type="submit" disabled={busy || text.trim() === ""}>
            {busy ? "Working…" : "Extract ingredients"}
          </button>
        </form>
      )}

      {source === "file" && (
        <div className="stack">
          <label
            className={dragging ? "drop-zone dragging" : "drop-zone"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v4h16v-4" />
            </svg>
            <span className="source-title">Choose a file or take a photo</span>
            <span className="muted">.txt, .md, .pdf, or an image</span>
            <input
              type="file"
              aria-label="Choose a .txt, .md, .pdf, or image file"
              accept=".txt,.md,.pdf,image/*"
              onChange={(e) => void handleFile(e.target.files?.[0])}
              disabled={busy}
            />
          </label>
          {status && (
            <p className="muted" role="status">
              {status}
            </p>
          )}
        </div>
      )}

      {source === "type" && (
        <div className="stack">
          <p className="muted">Start with a blank recipe and add the name, servings, tags, and ingredients yourself.</p>
          <Link className="button" to="/recipes/new">
            Start a blank recipe
          </Link>
        </div>
      )}

      {error && <p role="alert">{error}</p>}
    </div>
  );
}
