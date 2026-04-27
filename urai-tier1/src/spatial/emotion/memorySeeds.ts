import type { SpatialMemory } from "./types";

export const spatialMemorySeeds: SpatialMemory[] = [
  {
    id: "origin",
    title: "Origin Point",
    kind: "milestone",
    tone: "awe",
    symbolicWeight: "medium",
    auraColor: "#8fb7ff",
    intensity: 0.68,
    replayDensity: 0.55,
    narratorSeed: "This is where the path begins to organize itself.",
  },
  {
    id: "threshold",
    title: "Threshold Moment",
    kind: "threshold",
    tone: "tension",
    symbolicWeight: "threshold",
    auraColor: "#c59cff",
    intensity: 0.92,
    replayDensity: 0.88,
    narratorSeed: "This memory marks a crossing point.",
  },
  {
    id: "recovery",
    title: "Recovery Signal",
    kind: "recovery",
    tone: "recovery",
    symbolicWeight: "heavy",
    auraColor: "#9fffd0",
    intensity: 0.82,
    replayDensity: 0.72,
    narratorSeed: "This is where the system begins to return.",
  },
];

export function memoryFromUnknown(input: unknown, fallbackId = "origin"): SpatialMemory {
  const candidate = input as Partial<SpatialMemory> | null | undefined;
  const seed = spatialMemorySeeds.find((m) => m.id === fallbackId) ?? spatialMemorySeeds[0];

  if (!candidate) return seed;

  return {
    id: String(candidate.id ?? seed.id),
    title: String(candidate.title ?? seed.title),
    kind: candidate.kind ?? seed.kind,
    tone: candidate.tone ?? seed.tone,
    symbolicWeight: candidate.symbolicWeight ?? seed.symbolicWeight,
    timestamp: candidate.timestamp ?? seed.timestamp,
    auraColor: String(candidate.auraColor ?? seed.auraColor),
    intensity: Number(candidate.intensity ?? seed.intensity),
    replayDensity: Number(candidate.replayDensity ?? seed.replayDensity),
    narratorSeed: candidate.narratorSeed ?? seed.narratorSeed,
  };
}
