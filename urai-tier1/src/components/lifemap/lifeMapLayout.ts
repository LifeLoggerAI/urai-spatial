import type { LifeMapNode } from "./lifeMapData";

export type LifeMapDisplayPosition = [number, number, number];

// The Life Map is a volume, not a diagram. Chapters deliberately occupy
// different height and depth bands so overview framing never collapses the
// person's history into a horizontal row. Keep these centers compact enough
// for an intimate camera while preserving a clear near-to-deep-time journey.
const CHAPTER_CENTERS: Record<string, LifeMapDisplayPosition> = {
  "spring-becoming": [-5.8, 2.1, -3.8],
  "threshold-return": [-1.5, -2.15, -8.9],
  "relationship-orbit": [5.45, 0.75, -12.8],
  "forward-weather": [1.35, 4.5, -19.2],
  "legacy-deep-time": [-4.15, -1.35, -24.6],
};

function hashUnit(value: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 9999;
}

export function lifeMapChapterCenter(eraId?: string): LifeMapDisplayPosition {
  return CHAPTER_CENTERS[eraId || ""] || [-3.8, -0.8, -23.2];
}

export function lifeMapDisplayPosition(node: LifeMapNode): LifeMapDisplayPosition {
  const center = lifeMapChapterCenter(node.eraId);
  const angle = hashUnit(node.id, 17) * Math.PI * 2;
  const radius = 1.15 + hashUnit(node.id, 31) * 1.75;
  const lift = (hashUnit(node.id, 47) - 0.5) * 2.65;
  const depth = (hashUnit(node.id, 71) - 0.5) * 3.4;
  return [
    center[0] + Math.cos(angle) * radius,
    center[1] + lift,
    center[2] + Math.sin(angle) * radius * 0.7 + depth,
  ];
}

export const LIFE_MAP_CORE_POSITION: LifeMapDisplayPosition = [0, -0.1, -8.4];
export const LIFE_MAP_OVERVIEW_POSITION: LifeMapDisplayPosition = [0, 2.8, 22.4];
export const LIFE_MAP_OVERVIEW_TARGET: LifeMapDisplayPosition = [0, 0.45, -10.4];
