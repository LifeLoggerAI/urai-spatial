"use client";

import { demoConstellationEdges } from "@/lib/spatial/publicSafeSpatialData";

export function useConstellationEdges() {
  return { edges: demoConstellationEdges, loading: false, error: null as Error | null, isPreview: true };
}
