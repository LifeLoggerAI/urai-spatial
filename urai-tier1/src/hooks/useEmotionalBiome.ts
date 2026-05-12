"use client";

import { demoEmotionalBiome } from "@/lib/spatial/publicSafeSpatialData";

export function useEmotionalBiome() {
  return { biome: demoEmotionalBiome, loading: false, error: null as Error | null, isPreview: true };
}
