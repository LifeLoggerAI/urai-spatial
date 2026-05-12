"use client";

import { demoLifeMapNodes } from "@/lib/spatial/publicSafeSpatialData";

export function useLifeMapNodes() {
  return { nodes: demoLifeMapNodes, loading: false, error: null as Error | null, isPreview: true };
}
