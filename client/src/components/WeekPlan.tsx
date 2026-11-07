// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Pieces of the week's plan shared by This Week and the library's
// ABOUTME: desktop panel (INT-MF-0008): the planned recipes with remove buttons,
// ABOUTME: and a Clear control that asks for confirmation inline.
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Selection } from "../lib/api";
import { recipeMeta } from "../lib/week";
import { Icon } from "./Icon";

export function PlannedRecipes({
  selections,
  onRemove,
}: {
  selections: Selection[];
  onRemove: (recipeId: number) => void;
}) {
  return (
    <ul className="card-list planned-list">
      {selections.map((selection) => (
        <li key={selection.recipeId} className="card planned-recipe">
          <Link to={`/recipes/${selection.recipeId}`} className="planned-link">
            <h3>{selection.name}</h3>
            <span className="muted">{recipeMeta(selection.ingredientCount, selection.servings)}</span>
          </Link>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove ${selection.name} from this week`}
            onClick={() => onRemove(selection.recipeId)}
          >
            <Icon name="close" size={20} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ClearWeek({ onClear, label = "Clear the week" }: { onClear: () => void; label?: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="link-button" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }

  return (
    <div className="notice warn clear-confirm" role="group" aria-label="Confirm clearing the week">
      <p>
        <strong>Clear every selected recipe?</strong> Recipes stay in your library. Only this week’s plan is cleared.
      </p>
      <div className="toolbar">
        <button
          type="button"
          className="danger"
          onClick={() => {
            onClear();
            setConfirming(false);
          }}
        >
          Clear
        </button>
        <button type="button" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
