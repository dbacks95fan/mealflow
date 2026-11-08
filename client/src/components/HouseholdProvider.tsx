// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Loads the household name once and shares it through HouseholdContext.
import { useEffect, useState, type ReactNode } from "react";
import { getHousehold } from "../lib/api";
import { HouseholdContext } from "../lib/useHousehold";

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    // The header can show the wordmark alone, so a failed load only hides the
    // name; Settings reports the error where the household can act on it.
    getHousehold()
      .then((h) => setName(h.name))
      .catch(() => setName(null));
  }, []);

  return <HouseholdContext.Provider value={{ name, setName }}>{children}</HouseholdContext.Provider>;
}
