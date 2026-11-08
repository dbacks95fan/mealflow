// ABOUTME: Create or edit a recipe — name, servings, tags, and a dynamic list
// ABOUTME: of ingredient rows (name / quantity / unit / note).
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
  const draft = (location.state as { draft?: RecipeDraft } | null)?.draft ?? null;

  const [name, setName] = useState(() => draft?.name ?? "");
  const [servings, setServings] = useState(() =>
    draft?.servings != null ? String(draft.servings) : "",
  );
  const [tags, setTags] = useState("");
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
        setTags(r.tags.join(", "));
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
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
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
    <form onSubmit={handleSubmit} className="stack">
      <h2>{editing ? "Edit recipe" : "New recipe"}</h2>

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

      <label>
        Tags (comma separated, optional)
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dinner, vegetarian" />
      </label>

      <fieldset>
        <legend>Ingredients</legend>
        {rows.map((row, index) => (
          <div key={index} className="ingredient-row">
            <input
              aria-label={`Ingredient ${index + 1} name`}
              placeholder="Ingredient"
              value={row.name}
              onChange={(e) => updateRow(index, { name: e.target.value })}
            />
            <input
              aria-label={`Ingredient ${index + 1} quantity`}
              placeholder="Qty"
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
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              aria-label={`Remove ingredient ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow}>
          Add ingredient
        </button>
      </fieldset>

      {error && <p role="alert">{error}</p>}

      <div className="toolbar">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save recipe"}
        </button>
        <button type="button" onClick={() => navigate(editing ? `/recipes/${id}` : "/")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
