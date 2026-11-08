// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Shares the household name between the app header and Settings, so a
// ABOUTME: rename shows in the header straight away. The provider lives in
// ABOUTME: components/HouseholdProvider.tsx.
import { createContext, useContext } from "react";

export interface HouseholdState {
  name: string | null;
  setName: (name: string) => void;
}

export const HouseholdContext = createContext<HouseholdState | null>(null);

/** The shared household name, or null when rendered outside a HouseholdProvider. */
export function useHousehold(): HouseholdState | null {
  return useContext(HouseholdContext);
}
