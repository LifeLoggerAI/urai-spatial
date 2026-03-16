export type SpatialEra = "origins" | "ascent" | "fracture" | "return" | "becoming";
export type SpatialKind = "memory" | "threshold" | "recovery" | "signal" | "echo";

export type SpatialStar = {
  id: string;
  order: number;
  title: string;
  label: string;
  signature: string;
  chapter: string;
  timeband: string;
  era: SpatialEra;
  kind: SpatialKind;
  description: string;
  color: string;
  size: number;
  glow: number;
  intensity: number;
  position: [number, number, number];
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_SEED = 19830414;
const STAR_COUNT = 42;

const COLORS = [
  "#f7f3c6",
  "#f8c7d8",
  "#c9ddff",
  "#ffd98a",
  "#e8f7df",
] as const;

const LABELS = ["Memory", "Threshold", "Recovery", "Signal", "Echo"] as const;
const KINDS: SpatialKind[] = ["memory", "threshold", "recovery", "signal", "echo"];
const CHAPTERS = ["Origins", "Ascent", "Fracture", "Return", "Becoming"] as const;
const ERAS: SpatialEra[] = ["origins", "ascent", "fracture", "return", "becoming"];
const TIMEBANDS = ["Winter", "Spring", "Summer", "Autumn", "Night"] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rounded(n: number, places = 3) {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

export function buildSpatialStars(seed = STAR_SEED, count = STAR_COUNT): SpatialStar[] {
  const rand = mulberry32(seed);

  return Array.from({ length: count }, (_, index) => {
    const chapterIndex = index % CHAPTERS.length;
    const labelIndex = index % LABELS.length;

    const ring = 14 + chapterIndex * 6 + rand() * 5;
    const angle = (index / count) * Math.PI * 2 * 1.7 + rand() * 0.9;
    const height = (rand() - 0.5) * 14 + (chapterIndex - 2) * 1.4;

    const x = rounded(Math.cos(angle) * ring + (rand() - 0.5) * 2.6);
    const y = rounded(height);
    const z = rounded(Math.sin(angle) * ring + (rand() - 0.5) * 2.6);

    const size = rounded(0.9 + rand() * 1.4, 2);
    const glow = rounded(0.55 + rand() * 0.55, 2);
    const intensity = rounded(clamp(0.65 + rand() * 0.5, 0.65, 1.15), 2);

    return {
      id: `star-${index + 1}`,
      order: index + 1,
      title: `${CHAPTERS[chapterIndex]} ${index + 1}`,
      label: LABELS[labelIndex],
      signature: `${TIMEBANDS[chapterIndex]} · ${LABELS[labelIndex]}`,
      chapter: CHAPTERS[chapterIndex],
      timeband: TIMEBANDS[chapterIndex],
      era: ERAS[chapterIndex],
      kind: KINDS[labelIndex],
      description:
        `Deterministic spatial node ${index + 1}. ` +
        `This is the current canonical placeholder content contract for focus and replay.`,
      color: COLORS[(chapterIndex + labelIndex) % COLORS.length],
      size,
      glow,
      intensity,
      position: [x, y, z],
    };
  });
}

export const SPATIAL_STARS: SpatialStar[] = buildSpatialStars();

export function getSpatialStarById(id: string | null | undefined): SpatialStar | null {
  if (!id) return null;
  return SPATIAL_STARS.find((star) => star.id === id) ?? null;
}

/* PHASE6_REAL_MEMORY_HOOK */
import { buildStarsFromMemory } from "../lib/memoryToStar";

export const SPATIAL_STARS_REAL = buildStarsFromMemory();
