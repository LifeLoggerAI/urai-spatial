import { sanitizeStars } from "@/spatial/lib/renderGuards";
export type RawSpatialStar = {
  id: string;
  name: string;
  significanceTier: number;
  fadeWeight: number;
  peripheralWeight: number;
  ra: number;
  dec: number;
  dist: number;
  mass: number;
  radius: number;
  color: string;
  narratorEligible?: boolean;
  replayEligible?: boolean;
};

export const SPATIAL_STARS: RawSpatialStar[] = [
  {
    id: "1",
    name: "Sol",
    significanceTier: 4,
    fadeWeight: 0.8,
    peripheralWeight: 0.2,
    ra: 0,
    dec: 0,
    dist: 0,
    mass: 1,
    radius: 1,
    color: "#FFFFFF",
  },
  {
    id: "2",
    name: "Alpha Centauri",
    significanceTier: 3,
    fadeWeight: 0.6,
    peripheralWeight: 0.4,
    ra: 14.5,
    dec: -60.8,
    dist: 4.37,
    mass: 1.1,
    radius: 1.22,
    color: "#FFEBCD",
  },
  {
    id: "3",
    name: "Barnard's Star",
    significanceTier: 2,
    fadeWeight: 0.3,
    peripheralWeight: 0.7,
    ra: 17.9,
    dec: 4.6,
    dist: 5.96,
    mass: 0.14,
    radius: 0.19,
    color: "#FFC0CB",
  },
  {
    id: "4",
    name: "Wolf 359",
    significanceTier: 1,
    fadeWeight: 0.1,
    peripheralWeight: 0.9,
    ra: 10.9,
    dec: 7,
    dist: 7.78,
    mass: 0.09,
    radius: 0.16,
    color: "#FF6347",
  },
  {
    id: "5",
    name: "Lalande 21185",
    significanceTier: 1,
    fadeWeight: 0.2,
    peripheralWeight: 0.8,
    ra: 11.1,
    dec: 35.9,
    dist: 8.29,
    mass: 0.46,
    radius: 0.39,
    color: "#FFDAB9",
  },
];

export function resolveStarById(id: string | null | undefined) {
  if (!id) return null;
  return SPATIAL_STARS.find((star) => star.id === id) ?? null;
}


export const __TEST_STAR = {
  id: "__test__",
  position: [0, 0, -20],
  color: "#ffffff",
  size: 0.5
};
