import type { LifeMapNode } from "./lifeMapData";

export type LifeMapDisplayPosition = [number, number, number];

// Keep chapter systems visibly separated in all camera profiles. The portrait
// runtime compresses horizontal scale by design, so the authored field needs
// meaningful world-space separation before that projection is applied.
const CHAPTER_CENTERS: Record<string, LifeMapDisplayPosition> = {
  "spring-becoming": [-10.8, 1.2, -6.4],
  "threshold-return": [-2.7, -0.35, -10.2],
  "relationship-orbit": [8.9, 1.35, -8.1],
  "forward-weather": [1.6, 3.15, -16.4],
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
  return CHAPTER_CENTERS[eraId || ""] || [-4.2, 0.45, -12.4];
}

export function lifeMapDisplayPosition(node: LifeMapNode): LifeMapDisplayPosition {
  const center = lifeMapChapterCenter(node.eraId);
  const angle = hashUnit(node.id, 17) * Math.PI * 2;
  const radius = 1.8 + hashUnit(node.id, 31) * 2.4;
  const lift = (hashUnit(node.id, 47) - 0.5) * 2.15;
  const depth = (hashUnit(node.id, 71) - 0.5) * 2.3;
  return [
    center[0] + Math.cos(angle) * radius,
    center[1] + lift,
    center[2] + Math.sin(angle) * radius * 0.7 + depth,
  ];
}

export const LIFE_MAP_CORE_POSITION: LifeMapDisplayPosition = [0, -0.1, -8.4];
export const LIFE_MAP_OVERVIEW_POSITION: LifeMapDisplayPosition = [0, 2.8, 22.4];
export const LIFE_MAP_OVERVIEW_TARGET: LifeMapDisplayPosition = [0, 0.45, -10.4];
