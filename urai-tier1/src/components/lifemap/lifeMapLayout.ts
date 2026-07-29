import type { LifeMapNode } from "./lifeMapData";

export type LifeMapDisplayPosition = [number, number, number];

const CHAPTER_CENTERS: Record<string, LifeMapDisplayPosition> = {
  "spring-becoming": [-5.1, 0.9, -5.2],
  "threshold-return": [2.4, -0.15, -4.1],
  "relationship-orbit": [5.35, 1.1, -7.3],
  "forward-weather": [0.7, 2.55, -11.8],
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
  return CHAPTER_CENTERS[eraId || ""] || [-1.2, 0.35, -6.2];
}

export function lifeMapDisplayPosition(node: LifeMapNode): LifeMapDisplayPosition {
  const center = lifeMapChapterCenter(node.eraId);
  const angle = hashUnit(node.id, 17) * Math.PI * 2;
  const radius = 1.15 + hashUnit(node.id, 31) * 1.55;
  const lift = (hashUnit(node.id, 47) - 0.5) * 1.65;
  const depth = (hashUnit(node.id, 71) - 0.5) * 1.45;
  return [
    center[0] + Math.cos(angle) * radius,
    center[1] + lift,
    center[2] + Math.sin(angle) * radius * 0.58 + depth,
  ];
}

export const LIFE_MAP_CORE_POSITION: LifeMapDisplayPosition = [0, 0.25, -5.4];
export const LIFE_MAP_OVERVIEW_POSITION: LifeMapDisplayPosition = [0, 2.1, 16.8];
export const LIFE_MAP_OVERVIEW_TARGET: LifeMapDisplayPosition = [0, 0.25, -6.15];
