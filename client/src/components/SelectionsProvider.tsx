// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Holds one "this week" list for the whole app, so the navigation badge
// ABOUTME: and every page that calls useSelections stay in step.
import type { ReactNode } from "react";
import { SelectionsContext, useSelectionsState } from "../lib/useSelections";

export function SelectionsProvider({ children }: { children: ReactNode }) {
  const value = useSelectionsState(true);
  return <SelectionsContext.Provider value={value}>{children}</SelectionsContext.Provider>;
}
