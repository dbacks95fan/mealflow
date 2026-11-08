// ABOUTME: Hook over /api/selections — the shared "this week" recipe list. Inside
// ABOUTME: a SelectionsProvider (components/) every caller shares one list, so the
// ABOUTME: navigation badge and the pages stay in step; outside one, the hook
// ABOUTME: keeps its own.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  addSelection,
  clearSelections,
  listSelections,
  removeSelection,
  type Selection,
} from "./api";

export interface SelectionsState {
  selections: Selection[] | null;
  isSelected: (recipeId: number) => boolean;
  toggle: (recipeId: number) => Promise<void>;
  clear: () => Promise<void>;
  error: string | null;
}

export const SelectionsContext = createContext<SelectionsState | null>(null);

export function useSelectionsState(enabled: boolean): SelectionsState {
  const [selections, setSelections] = useState<Selection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    listSelections()
      .then(setSelections)
      .catch((err: Error) => setError(err.message));
  }, [enabled]);

  const isSelected = useCallback(
    (recipeId: number) => Boolean(selections?.some((s) => s.recipeId === recipeId)),
    [selections],
  );

  const toggle = useCallback(
    async (recipeId: number) => {
      try {
        const next = isSelected(recipeId)
          ? await removeSelection(recipeId)
          : await addSelection(recipeId);
        setSelections(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update the weekly selection");
      }
    },
    [isSelected],
  );

  const clear = useCallback(async () => {
    try {
      await clearSelections();
      setSelections([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear the week");
    }
  }, []);

  return { selections, isSelected, toggle, clear, error };
}

export function useSelections(): SelectionsState {
  const shared = useContext(SelectionsContext);
  // Hooks can't be called conditionally, so the local state always exists but
  // only fetches when there is no provider to share.
  const local = useSelectionsState(shared === null);
  return shared ?? local;
}
