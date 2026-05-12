"use client";

import { demoCompanionState } from "@/lib/spatial/publicSafeSpatialData";

export function useCompanionState() {
  return { companionState: demoCompanionState, loading: false, error: null as Error | null, isPreview: true };
}
