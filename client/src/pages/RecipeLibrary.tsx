// ABOUTME: The household recipe list — search by name/tag, plan the week with a
// ABOUTME: one-tap Week toggle on each card, see the plan at a glance (a summary
// ABOUTME: bar on phones, a "This week" panel beside the cards on wide screens),
// ABOUTME: or start a new recipe.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { StepBar } from "../components/StepBar";
import { ClearWeek, PlannedRecipes } from "../components/WeekPlan";
import { listRecipes, type RecipeSummary, type Selection } from "../lib/api";
import { useSelections } from "../lib/useSelections";
import { plural, recipeMeta, weekSummary } from "../lib/week";

function EmptyLibrary() {
  return (
    <div className="stack">
      <div className="empty-state">
        <p>
          <strong>Your recipe library is empty.</strong>
        </p>
        <p className="muted">Bring in a recipe from a web page or text, or type one in.</p>
        <div className="toolbar">
          <Link className="button" to="/recipes/import">
            Import a recipe
          </Link>
          <Link className="button-outline" to="/recipes/new">
            Type one in
          </Link>
        </div>
      </div>
      <ol className="how-it-works">
        <li>
          <strong>Add recipes</strong>
          <span className="muted">Import or type in the meals your household makes.</span>
        </li>
        <li>
          <strong>Plan the week</strong>
          <span className="muted">Pick the recipes you’ll cook this week.</span>
        </li>
        <li>
          <strong>Fill the Fry’s cart</strong>
          <span className="muted">MealFlow combines the ingredients and adds them to your cart.</span>
        </li>
      </ol>
    </div>
  );
}

function WeekPanel({
  selections,
  onRemove,
  onClear,
}: {
  selections: Selection[];
  onRemove: (recipeId: number) => void;
  onClear: () => void;
}) {
  return (
    <aside className="week-panel card" aria-labelledby="week-panel-title">
      <div className="page-heading">
        <h2 id="week-panel-title">This week</h2>
        {selections.length > 0 && <ClearWeek onClear={onClear} label="Clear" />}
      </div>
      <StepBar current={1} />
      {selections.length === 0 ? (
        <p className="muted">No recipes selected yet. Use Add to this week on a recipe to plan it.</p>
      ) : (
        <>
          <PlannedRecipes selections={selections} onRemove={onRemove} />
          <p className="muted">{weekSummary(selections)}</p>
          <Link className="button" to="/groceries">
            Build the grocery list
          </Link>
        </>
      )}
    </aside>
  );
}

export function RecipeLibrary() {
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { selections, isSelected, toggle, clear } = useSelections();
  const planned = selections ?? [];

  useEffect(() => {
    listRecipes()
      .then(setRecipes)
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [recipes, query]);

  if (error) return <p role="alert">Failed to load recipes: {error}</p>;
  if (!recipes) return <p>Loading recipes…</p>;
  if (recipes.length === 0) return <EmptyLibrary />;

  return (
    <div className="library-layout">
      <div className="stack library-main">
        <div className="toolbar library-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search recipes or tags"
              aria-label="Search recipes or tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Link className="button add-recipe" to="/recipes/new">
            <Icon name="plus" size={20} strokeWidth={2.6} />
            <span className="add-recipe-text">Add recipe</span>
          </Link>
          <Link className="button-outline" to="/recipes/import">
            Import
          </Link>
        </div>

        <p className="muted library-count">
          {plural(recipes.length, "recipe")}
          {planned.length > 0 && (
            <>
              {" · "}
              <Link to="/this-week">{plural(planned.length, "recipe")} this week</Link>
            </>
          )}
        </p>

        {filtered.length === 0 ? (
          <p>No recipes match “{query}”.</p>
        ) : (
          <ul className="card-list recipe-grid">
            {filtered.map((recipe) => {
              const inWeek = isSelected(recipe.id);
              return (
                <li key={recipe.id} className={inWeek ? "card recipe-card selected" : "card recipe-card"}>
                  <Link to={`/recipes/${recipe.id}`} className="recipe-card-link">
                    <h3>{recipe.name}</h3>
                    <span className="muted">{recipeMeta(recipe.ingredientCount, recipe.servings)}</span>
                  </Link>
                  {recipe.tags.length > 0 && (
                    <p className="tag-row">
                      {recipe.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </p>
                  )}
                  <button
                    type="button"
                    className="week-toggle"
                    aria-pressed={inWeek}
                    onClick={() => void toggle(recipe.id)}
                  >
                    <Icon name={inWeek ? "check" : "plus"} size={18} strokeWidth={2.6} />
                    {inWeek ? "In this week" : "Add to this week"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {planned.length > 0 && (
          <div className="week-summary" aria-label="This week's plan">
            <p>
              <strong>{plural(planned.length, "recipe")} this week</strong>
              <span>Ready to build a grocery list</span>
            </p>
            <Link className="button" to="/this-week">
              Review week
            </Link>
          </div>
        )}
      </div>

      <WeekPanel selections={planned} onRemove={(id) => void toggle(id)} onClear={() => void clear()} />
    </div>
  );
}
