// ABOUTME: Combined grocery list from the week's selected recipes — one compact
// ABOUTME: row per ingredient with its combined amount and recipes, a per-row
// ABOUTME: pantry toggle, a "hide what I have" switch, and counts of what goes on
// ABOUTME: to Fry's. Review here before sending to Fry's.
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
import { Icon } from "../components/Icon";
import { StepBar } from "../components/StepBar";
import { Switch } from "../components/Switch";
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
  const inPantry = list.lines.filter((line) => line.inPantry).length;
  // Fry's matching skips pantry items, so this is what the next step sends.
  const toMatch = list.lines.length - inPantry;
  const matchLabel = `Match ${toMatch} item${toMatch === 1 ? "" : "s"} to Fry’s`;

  return (
    <div className="stack">
      <h2>Grocery list</h2>
      <p className="muted">
        From {list.recipeCount} recipe{list.recipeCount === 1 ? "" : "s"}. Review before sending to Fry’s.
      </p>
      <StepBar current={2} />

      <div className="grocery-summary">
        <p>
          <strong>
            {list.lines.length} item{list.lines.length === 1 ? "" : "s"}
          </strong>{" "}
          · {inPantry} in pantry
        </p>
        <Switch label="Hide what I have" checked={hidePantry} onChange={setHidePantry} />
      </div>

      {visible.length > 0 && (
        <ul className="card grocery-list">
          {visible.map((line) => (
            <li key={line.normalizedName} className={line.inPantry ? "grocery-row in-pantry" : "grocery-row"}>
              <div className="grocery-text">
                <span className="grocery-line">
                  <strong>{line.name}</strong>
                  <span className="grocery-amount">{formatAmounts(line.quantities)}</span>
                </span>
                <span className="muted">
                  From {Array.from(new Set(line.contributions.map((c) => c.recipeName))).join(", ")}
                </span>
              </div>
              <button
                type="button"
                className="pantry-button"
                aria-pressed={line.inPantry}
                aria-label={`Have it: ${line.name}`}
                onClick={() => void togglePantry(line.normalizedName, line.name)}
              >
                {line.inPantry && <Icon name="check" size={16} strokeWidth={2.6} />}
                {line.inPantry ? "Have it" : "Have it?"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {visible.length === 0 && <p>Everything on the list is in your pantry.</p>}

      <div className="action-bar">
        {toMatch > 0 ? (
          <Link className="button" to="/frys">
            {matchLabel}
          </Link>
        ) : (
          <button type="button" className="button" disabled>
            {matchLabel}
          </button>
        )}
        <p className="muted action-note">Items you already have are skipped.</p>
      </div>
    </div>
  );
}
