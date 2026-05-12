"use client";

import { demoSpatialWorld } from "@/lib/spatial/publicSafeSpatialData";

export function useSpatialWorld() {
  return { world: demoSpatialWorld, loading: false, error: null as Error | null, isPreview: true };
}
