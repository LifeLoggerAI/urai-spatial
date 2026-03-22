import type { StarData, Vec3 } from "../types";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = ["#d8e7ff", "#f8fbff", "#a8c8ff", "#d0d8ff", "#ffffff"];

export function createDeterministicStars(count = 52, seed = 14414): StarData[] {
  const rand = mulberry32(seed);
  const stars: StarData[] = [];

  for (let i = 0; i < count; i += 1) {
    const lane = i % 3;
    const xSpread = lane === 0 ? 16 : lane === 1 ? 28 : 40;
    const x = (rand() - 0.5) * xSpread;
    const y = 1.6 + lane * 1.5 + rand() * 4.6;
    const z = -8 - i * 1.55 - rand() * 14;
    const size = 0.09 + rand() * 0.18;
    const glow = 0.9 + rand() * 1.75;
    const color = COLORS[Math.floor(rand() * COLORS.length)] ?? "#ffffff";
    stars.push({
      id: `star-${i + 1}`,
      label: `Memory ${i + 1}`,
      position: [x, y, z] as Vec3,
      color,
      size,
      glow,
      chapter: lane === 0 ? "origin" : lane === 1 ? "threshold" : "return",
    });
  }

  stars.sort((a, b) => b.position[2] - a.position[2]);
  return stars;
}

export const STARS = createDeterministicStars();

export function resolveStarById(id?: string | null): StarData | null {
  if (!id) return null;
  return STARS.find((star) => star.id === id) ?? null;
}
