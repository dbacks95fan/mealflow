// ABOUTME: Create, review (after an import), or edit a recipe — name, servings,
// ABOUTME: tag chips, and stacked ingredient cards (name, then quantity / unit /
// ABOUTME: note) that fit a phone, with a sticky Cancel / Save bar.
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createRecipe,
  getRecipe,
  updateRecipe,
  type IngredientInput,
  type RecipeDraft,
  type RecipeInput,
} from "../lib/api";
import { Icon } from "../components/Icon";

const IMPORTED_FROM: Record<string, string> = {
  url: "a web page",
  paste: "pasted text",
  file: "a file",
};

interface Row {
  name: string;
  quantity: string;
  unit: string;
  note: string;
}

const blankRow: Row = { name: "", quantity: "", unit: "", note: "" };

function draftToRows(draft: RecipeDraft): Row[] {
  if (draft.ingredients.length === 0) return [{ ...blankRow }];
  return draft.ingredients.map((i) => ({
    name: i.name,
    quantity: i.quantity != null ? String(i.quantity) : "",
    unit: i.unit ?? "",
    note: i.note ?? "",
  }));
}

export function RecipeForm() {
  const { id } = useParams();
  const editing = id != null;
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { draft?: RecipeDraft; source?: string } | null;
  const draft = state?.draft ?? null;
  const importedFrom = draft ? (IMPORTED_FROM[state?.source ?? ""] ?? "another source") : null;

  const [name, setName] = useState(() => draft?.name ?? "");
  const [servings, setServings] = useState(() =>
    draft?.servings != null ? String(draft.servings) : "",
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [rows, setRows] = useState<Row[]>(() => (draft ? draftToRows(draft) : [{ ...blankRow }]));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // When editing, the form waits for the saved recipe so typing can't be
  // overwritten by a load that finishes late.
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    getRecipe(Number(id))
      .then((r) => {
        setLoaded(true);
        setName(r.name);
        setServings(r.servings != null ? String(r.servings) : "");
        setTags(r.tags);
        setRows(
          r.ingredients.length > 0
            ? r.ingredients.map((i) => ({
                name: i.name,
                quantity: i.quantity != null ? String(i.quantity) : "",
                unit: i.unit ?? "",
                note: i.note ?? "",
              }))
            : [{ ...blankRow }],
        );
      })
      .catch((err: Error) => setError(err.message));
  }, [editing, id]);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, { ...blankRow }]);
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  /** Add every comma-separated tag in `raw` that isn't already a chip. */
  function addTags(raw: string) {
    const fresh = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (fresh.length === 0) return;
    setTags((current) => [...current, ...fresh.filter((t) => !current.includes(t))]);
    setTagInput("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const ingredients: IngredientInput[] = rows
      .filter((row) => row.name.trim() !== "")
      .map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity.trim() ? Number(row.quantity) : null,
        unit: row.unit.trim() || null,
        note: row.note.trim() || null,
      }));

    if (name.trim() === "") {
      setError("A recipe name is required.");
      return;
    }
    if (ingredients.length === 0) {
      setError("Add at least one ingredient.");
      return;
    }
    if (ingredients.some((i) => i.quantity != null && Number.isNaN(i.quantity))) {
      setError("Ingredient quantities must be numbers.");
      return;
    }

    const payload: RecipeInput = {
      name: name.trim(),
      servings: servings.trim() ? Number(servings) : null,
      // A tag still in the input when saving counts too.
      tags: [...tags, ...tagInput.split(",").map((t) => t.trim()).filter((t) => t && !tags.includes(t))],
      ingredients,
    };

    setSubmitting(true);
    try {
      const saved = editing
        ? await updateRecipe(Number(id), payload)
        : await createRecipe(payload);
      navigate(`/recipes/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe");
      setSubmitting(false);
    }
  }

  if (!loaded) return error ? <p role="alert">{error}</p> : <p>Loading recipe…</p>;

  return (
    <form onSubmit={handleSubmit} className="stack recipe-form">
      <h2>{editing ? "Edit recipe" : draft ? "Review recipe" : "New recipe"}</h2>

      {importedFrom && (
        <p className="notice" role="note">
          Imported from {importedFrom}. Check each ingredient, then save. Nothing is saved until you do.
        </p>
      )}

      <label>
        Recipe name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        Servings (optional)
        <input
          type="number"
          min={1}
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
      </label>

      <div className="tag-field">
        <label htmlFor="recipe-tag-input">Tags (optional)</label>
        {tags.length > 0 && (
          <ul className="tag-row" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag} className="tag tag-chip">
                {tag}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => setTags((current) => current.filter((t) => t !== tag))}
                >
                  <Icon name="close" size={14} strokeWidth={2.6} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id="recipe-tag-input"
          value={tagInput}
          placeholder="Add a tag, then press Enter"
          onChange={(e) => {
            const value = e.target.value;
            if (value.includes(",")) addTags(value);
            else setTagInput(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTags(tagInput);
            }
          }}
          onBlur={() => addTags(tagInput)}
        />
      </div>

      <fieldset className="ingredients">
        <legend>Ingredients</legend>
        <ol className="ingredient-cards">
          {rows.map((row, index) => (
            <li key={index} className="card ingredient-card">
              <div className="ingredient-name-row">
                <input
                  aria-label={`Ingredient ${index + 1} name`}
                  placeholder="Ingredient"
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  aria-label={`Remove ingredient ${index + 1}`}
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
              <div className="ingredient-detail-row">
                <input
                  aria-label={`Ingredient ${index + 1} quantity`}
                  placeholder="Qty"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(e) => updateRow(index, { quantity: e.target.value })}
                />
                <input
                  aria-label={`Ingredient ${index + 1} unit`}
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                />
                <input
                  aria-label={`Ingredient ${index + 1} note`}
                  placeholder="Note"
                  value={row.note}
                  onChange={(e) => updateRow(index, { note: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="add-more add-ingredient" onClick={addRow}>
          <Icon name="plus" size={18} strokeWidth={2.6} />
          Add ingredient
        </button>
      </fieldset>

      {error && <p role="alert">{error}</p>}

      <div className="action-bar form-actions">
        <button type="button" onClick={() => navigate(editing ? `/recipes/${id}` : "/")}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save recipe"}
        </button>
      </div>
    </form>
  );
}
