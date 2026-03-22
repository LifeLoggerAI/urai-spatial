import type { SpatialStar } from "../types";

export const SPATIAL_STARS: SpatialStar[] = [
  { id: "star-1", label: "Origin", chapter: "Threshold", position: [-2.2, 1.7, -8.5], color: "#8ad8ff", size: 0.18 },
  { id: "star-2", label: "Memory", chapter: "Recall", position: [0.4, 2.0, -11.0], color: "#ffd38a", size: 0.17 },
  { id: "star-3", label: "Echo", chapter: "Reflection", position: [2.4, 2.5, -13.2], color: "#ff9abf", size: 0.16 },
  { id: "star-4", label: "Return", chapter: "Homecoming", position: [0.6, 3.6, -16.5], color: "#d8e8ff", size: 0.15 }
];

export function resolveStarById(id?: string | null) {
  if (!id) return undefined;
  return SPATIAL_STARS.find((s) => s.id === id);
}
