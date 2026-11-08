// ABOUTME: Combined grocery list from the week's selected recipes — grouped,
// ABOUTME: quantities combined, with an optional "hide what I already have" view
// ABOUTME: and a per-line pantry toggle. Review here before sending to Fry's.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addPantryItem,
  getGroceryList,
  listPantry,
  removePantryItem,
  type GroceryList,
  type PantryItem,
} from "../lib/api";
import { StepBar } from "../components/StepBar";
import { formatAmounts } from "../lib/format";

export function Groceries() {
  const [list, setList] = useState<GroceryList | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hidePantry, setHidePantry] = useState(false);

  const refresh = useCallback(() => {
    Promise.all([getGroceryList(), listPantry()])
      .then(([groceryList, pantryItems]) => {
        setList(groceryList);
        setPantry(pantryItems);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(refresh, [refresh]);

  const pantryByNormalized = useMemo(
    () => new Map(pantry.map((item) => [item.normalizedName, item.id])),
    [pantry],
  );

  async function togglePantry(normalizedName: string, name: string) {
    try {
      const existingId = pantryByNormalized.get(normalizedName);
      const next = existingId != null ? await removePantryItem(existingId) : await addPantryItem(name);
      setPantry(next);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the pantry");
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!list) return <p>Loading grocery list…</p>;

  if (list.recipeCount === 0) {
    return (
      <div className="stack">
        <h2>Grocery list</h2>
        <StepBar current={2} />
        <div className="empty-state">
          <p>No recipes selected for the week yet.</p>
          <p className="muted">
            Add recipes to <Link to="/this-week">This Week</Link> to build a combined list.
          </p>
        </div>
      </div>
    );
  }

  const visible = hidePantry ? list.lines.filter((line) => !line.inPantry) : list.lines;

  return (
    <div className="stack">
      <h2>Grocery list</h2>
      <p className="muted">
        From {list.recipeCount} recipe{list.recipeCount === 1 ? "" : "s"}. Review before sending to Fry’s.
      </p>
      <StepBar current={2} />

      <label className="inline-field">
        <input
          type="checkbox"
          checked={hidePantry}
          onChange={(e) => setHidePantry(e.target.checked)}
        />
        Hide items I already have
      </label>

      <ul className="card-list">
        {visible.map((line) => (
          <li key={line.normalizedName} className={line.inPantry ? "card muted-card" : "card"}>
            <div className="toolbar">
              <strong>{line.name}</strong>
              <span>{formatAmounts(line.quantities)}</span>
              <button
                type="button"
                aria-pressed={line.inPantry}
                onClick={() => void togglePantry(line.normalizedName, line.name)}
              >
                {line.inPantry ? "Already have ✓" : "I already have this"}
              </button>
            </div>
            <p className="muted">
              from {Array.from(new Set(line.contributions.map((c) => c.recipeName))).join(", ")}
            </p>
          </li>
        ))}
      </ul>

      {visible.length === 0 && <p>Everything on the list is in your pantry.</p>}

      <div className="action-bar">
        <Link className="button" to="/frys">
          Match to Fry’s products
        </Link>
      </div>
    </div>
  );
}
