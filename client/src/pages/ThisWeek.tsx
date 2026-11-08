// ABOUTME: The household's selected recipes for the week — remove one, or clear
// ABOUTME: the whole list after an inline confirmation — then build the grocery
// ABOUTME: list.
import { Link } from "react-router-dom";
import { StepBar } from "../components/StepBar";
import { ClearWeek, PlannedRecipes } from "../components/WeekPlan";
import { useSelections } from "../lib/useSelections";
import { weekSummary } from "../lib/week";

export function ThisWeek() {
  const { selections, toggle, clear, error } = useSelections();

  if (error) return <p role="alert">{error}</p>;
  if (!selections) return <p>Loading…</p>;

  if (selections.length === 0) {
    return (
      <div className="stack">
        <h2>This week</h2>
        <StepBar current={1} />
        <div className="empty-state">
          <p>
            <strong>No recipes selected yet.</strong>
          </p>
          <p className="muted">Pick recipes from your library to plan the week.</p>
          <Link className="button" to="/">
            Browse recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-heading">
        <h2>This week</h2>
        <ClearWeek onClear={() => void clear()} />
      </div>

      <StepBar current={1} />

      <p className="muted">{weekSummary(selections)}</p>

      <PlannedRecipes selections={selections} onRemove={(id) => void toggle(id)} />

      <Link to="/" className="add-more">
        <span aria-hidden="true">+</span> Add recipes from the library
      </Link>

      <div className="action-bar">
        <Link className="button" to="/groceries">
          Build the grocery list
        </Link>
      </div>
    </div>
  );
}
