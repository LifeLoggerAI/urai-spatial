import { buildStarsFromMemory } from "../lib/memoryToStar";

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
  dateLabel?: string;
  summary?: string;
  detail?: string;
  tags?: string[];
  transcript?: string;
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

          const ring = 6 + chapterIndex * 2 + rand() * 2;
          const angle = -Math.PI * 0.55 + (index / count) * Math.PI * 1.1 + rand() * 0.22;
          const height = (rand() - 0.5) * 5.5 + (chapterIndex - 2) * 0.45;

          const x = rounded(Math.cos(angle) * ring + (rand() - 0.5) * 1.8);
    const y = rounded(height);
          const z = rounded(-10 - chapterIndex * 3.4 - index * 0.18 + Math.sin(angle) * ring * 0.65 + (rand() - 0.5) * 1.4);

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
      dateLabel: `${TIMEBANDS[chapterIndex]} ${2026 - ((count - index) % 5)}`,
      summary: `${LABELS[labelIndex]} node ${index + 1} in ${CHAPTERS[chapterIndex]}.`,
      detail: `Placeholder detail for ${CHAPTERS[chapterIndex]} ${index + 1}.`,
      tags: [ERAS[chapterIndex], KINDS[labelIndex], TIMEBANDS[chapterIndex].toLowerCase()],
      transcript: `Replay placeholder transcript for ${CHAPTERS[chapterIndex]} ${index + 1}.`,
    };
  });
}

function normalizeStar(raw: Partial<SpatialStar>, index: number): SpatialStar {
  const fallback = buildSpatialStars(STAR_SEED + index, 1)[0];

  return {
    ...fallback,
    ...raw,
    id: raw.id ?? fallback.id,
    order: raw.order ?? index + 1,
    title: raw.title ?? fallback.title,
    label: raw.label ?? fallback.label,
    signature: raw.signature ?? fallback.signature,
    chapter: raw.chapter ?? fallback.chapter,
    timeband: raw.timeband ?? fallback.timeband,
    era: (raw.era as SpatialEra | undefined) ?? fallback.era,
    kind: (raw.kind as SpatialKind | undefined) ?? fallback.kind,
    description: raw.description ?? fallback.description,
    color: raw.color ?? fallback.color,
    size: 0.08,
    glow: raw.glow ?? fallback.glow,
    intensity: raw.intensity ?? fallback.intensity,
    position: (raw.position as [number, number, number] | undefined) ?? fallback.position,
    dateLabel: raw.dateLabel ?? fallback.dateLabel,
    summary: raw.summary ?? raw.description ?? fallback.summary,
    detail: raw.detail ?? raw.description ?? fallback.detail,
    tags: raw.tags ?? fallback.tags,
    transcript: raw.transcript ?? fallback.transcript,
  };
}

let realStars: SpatialStar[] = [];

try {
  const built = buildStarsFromMemory() as Partial<SpatialStar>[] | undefined;
  realStars = Array.isArray(built) ? built.map((star, index) => normalizeStar(star, index)) : [];
} catch (error) {
  console.warn("stars.ts: buildStarsFromMemory failed, using placeholder stars", error);
  realStars = [];
}

export const SPATIAL_STARS_REAL: SpatialStar[] = realStars;
export const SPATIAL_STARS: SpatialStar[] =
  SPATIAL_STARS_REAL.length > 0 ? SPATIAL_STARS_REAL : buildSpatialStars();

export function getSpatialStarById(id: string | null | undefined): SpatialStar | null {
  if (!id) return null;
  return SPATIAL_STARS.find((star) => star.id === id) ?? null;
}

export function generateStars(): SpatialStar[] {
  return SPATIAL_STARS;
}

export const resolveStarById = getSpatialStarById;
