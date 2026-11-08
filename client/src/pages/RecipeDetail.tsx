// ABOUTME: One recipe — ingredients with quantities/units, optional servings
// ABOUTME: scaling, and edit / delete actions.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { deleteRecipe, getRecipe, type Recipe } from "../lib/api";
import { formatIngredient } from "../lib/format";
import { useSelections } from "../lib/useSelections";

export function RecipeDetail() {
  const { id } = useParams();
  const recipeId = Number(id);
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scaleTo, setScaleTo] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { isSelected, toggle } = useSelections();

  useEffect(() => {
    getRecipe(recipeId)
      .then((r) => {
        setRecipe(r);
        setScaleTo(r.servings);
      })
      .catch((err: Error) => setError(err.message));
  }, [recipeId]);

  if (error) return <p role="alert">Failed to load recipe: {error}</p>;
  if (!recipe) return <p>Loading recipe…</p>;

  const scale =
    recipe.servings && scaleTo && scaleTo > 0 ? scaleTo / recipe.servings : 1;

  async function handleDelete() {
    try {
      await deleteRecipe(recipeId);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete recipe");
    }
  }

  return (
    <article className="stack">
      <div className="toolbar">
        <h2>{recipe.name}</h2>
        <div className="toolbar">
          <button
            type="button"
            className={isSelected(recipe.id) ? "week-toggle" : "button week-toggle"}
            aria-pressed={isSelected(recipe.id)}
            onClick={() => void toggle(recipe.id)}
          >
            <Icon name={isSelected(recipe.id) ? "check" : "plus"} size={18} strokeWidth={2.6} />
            {isSelected(recipe.id) ? "In this week" : "Add to this week"}
          </button>
          <Link className="button" to={`/recipes/${recipe.id}/edit`}>
            Edit
          </Link>
          {confirmingDelete ? (
            <>
              <span>Delete this recipe?</span>
              <button type="button" className="danger" onClick={handleDelete}>
                Delete
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          )}
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <p className="tag-row">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </p>
      )}

      {recipe.servings != null && (
        <label className="inline-field">
          Scale to
          <input
            type="number"
            min={1}
            value={scaleTo ?? recipe.servings}
            onChange={(e) => setScaleTo(Number(e.target.value))}
          />
          servings (recipe serves {recipe.servings})
        </label>
      )}

      <h3>Ingredients</h3>
      <ul className="ingredient-list">
        {recipe.ingredients.map((ingredient) => (
          <li key={ingredient.id}>{formatIngredient(ingredient, scale)}</li>
        ))}
      </ul>
    </article>
  );
}
