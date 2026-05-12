"use client";

import { demoMoodForecast } from "@/lib/spatial/publicSafeSpatialData";

export function useMoodForecast() {
  return { forecast: demoMoodForecast, loading: false, error: null as Error | null, isPreview: true };
}
