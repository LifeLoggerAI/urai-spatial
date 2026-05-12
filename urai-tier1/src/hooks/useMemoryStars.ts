"use client";

import { demoMemoryStars } from "@/lib/spatial/publicSafeSpatialData";

export function useMemoryStars() {
  return { stars: demoMemoryStars, loading: false, error: null as Error | null, isPreview: true };
}
