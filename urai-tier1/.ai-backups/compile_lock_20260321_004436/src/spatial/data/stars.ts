import type { GroundObject, SpatialStar, Vec3 } from "../types";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_COLORS = ["#f8fbff", "#dbe7ff", "#b7d0ff", "#ffffff", "#c7d8ff"];

export function createStars(count = 64, seed = 14414): SpatialStar[] {
  const rand = mulberry32(seed);
  const stars: SpatialStar[] = [];

  for (let i = 0; i < count; i += 1) {
    const band = i % 4;
    const x = (rand() - 0.5) * (band === 0 ? 10 : band === 1 ? 18 : band === 2 ? 28 : 40);
    const y = 2 + band * 1.2 + rand() * 5.2;
    const z = -8 - i * 1.6 - rand() * 11.5;
    const size = 0.06 + rand() * 0.16;
    const glow = 0.9 + rand() * 1.5;
    const color = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)] ?? "#ffffff";

    stars.push({
      id: "star-" + String(i + 1),
      label: "Memory " + String(i + 1),
      position: [x, y, z] as Vec3,
      color,
      size,
      glow,
    });
  }

  return stars;
}

export const STARS = createStars();

export function resolveStarById(id?: string | null): SpatialStar | null {
  if (!id) return null;
  return STARS.find((s) => s.id === id) ?? null;
}

export const GROUND_OBJECTS: GroundObject[] = [
  { id: "object-cube", position: [-3.2, 1.2, -1.0], scale: 1.8, kind: "cube" },
  { id: "object-capsule", position: [0.2, 1.9, -0.6], scale: 1.7, kind: "capsule" },
  { id: "object-cone", position: [3.3, 1.5, -0.9], scale: 1.9, kind: "cone" },
];
