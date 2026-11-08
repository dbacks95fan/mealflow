// ABOUTME: The household's selected recipes for the week — remove one, or clear
// ABOUTME: the whole list.
import { useState } from "react";
import { Link } from "react-router-dom";
import { StepBar } from "../components/StepBar";
import { useSelections } from "../lib/useSelections";

export function ThisWeek() {
  const { selections, toggle, clear, error } = useSelections();
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (error) return <p role="alert">{error}</p>;
  if (!selections) return <p>Loading…</p>;

  if (selections.length === 0) {
    return (
      <div className="stack">
        <h2>This week</h2>
        <StepBar current={1} />
        <div className="empty-state">
          <p>No recipes selected yet.</p>
          <p className="muted">
            Open a recipe in the <Link to="/">library</Link> and choose “Add to this week”.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>This week</h2>
        {confirmingClear ? (
          <>
            <span>Clear every selected recipe?</span>
            <button
              type="button"
              className="danger"
              onClick={() => {
                void clear();
                setConfirmingClear(false);
              }}
            >
              Clear
            </button>
            <button type="button" onClick={() => setConfirmingClear(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmingClear(true)}>
            Clear the week
          </button>
        )}
      </div>

      <StepBar current={1} />

      <ul className="card-list">
        {selections.map((selection) => (
          <li key={selection.recipeId} className="card">
            <div className="toolbar">
              <Link to={`/recipes/${selection.recipeId}`}>
                <h3>{selection.name}</h3>
              </Link>
              <button type="button" onClick={() => void toggle(selection.recipeId)}>
                Remove
              </button>
            </div>
            <p className="muted">
              {selection.ingredientCount} ingredient{selection.ingredientCount === 1 ? "" : "s"}
              {selection.servings ? ` · serves ${selection.servings}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <div className="action-bar">
        <Link className="button" to="/groceries">
          Build the grocery list
        </Link>
      </div>
    </div>
  );
}
