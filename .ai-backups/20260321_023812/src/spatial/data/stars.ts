"use client";

import type { SpatialStar } from "../types";

export const SPATIAL_STARS: SpatialStar[] = [
  { id: "star-origin", label: "Origin", chapter: "Threshold", position: [-2.6, 1.4, -7.5], color: "#8ad8ff", size: 0.16, glow: 1.2 },
  { id: "star-signal", label: "Signal", chapter: "Awakening", position: [-1.4, 2.1, -10.2], color: "#9ea8ff", size: 0.14, glow: 1.05 },
  { id: "star-memory", label: "Memory", chapter: "Recall", position: [0.25, 1.65, -8.8], color: "#ffd38a", size: 0.18, glow: 1.25 },
  { id: "star-echo", label: "Echo", chapter: "Reflection", position: [1.9, 2.45, -12.4], color: "#ff9abf", size: 0.15, glow: 1.15 },
  { id: "star-thread", label: "Thread", chapter: "Continuity", position: [3.0, 1.55, -9.4], color: "#8cf7d2", size: 0.17, glow: 1.18 },
  { id: "star-council", label: "Council", chapter: "Guidance", position: [-3.4, 3.2, -14.8], color: "#8aa2ff", size: 0.14, glow: 1.08 },
  { id: "star-replay", label: "Replay", chapter: "Witness", position: [-0.5, 3.1, -16.2], color: "#f8f0ff", size: 0.13, glow: 1.02 },
  { id: "star-skybridge", label: "Skybridge", chapter: "Ascent", position: [2.8, 3.05, -15.0], color: "#7fd5ff", size: 0.14, glow: 1.1 },
  { id: "star-homecoming", label: "Homecoming", chapter: "Return", position: [0.9, 4.2, -18.8], color: "#ffd7f2", size: 0.16, glow: 1.12 },
];

export function resolveStarById(id?: string | null): SpatialStar | undefined {
  if (!id) return undefined;
  return SPATIAL_STARS.find((s) => s.id === id);
}
