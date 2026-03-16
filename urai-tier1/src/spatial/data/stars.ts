import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
import seedrandom from "seedrandom";
import { getMemoryMetadata } from "@/spatial/data/memoryDataset";

export type StarRecord = {
  id: string;
  position: [number, number, number];
  size: number;
  color: string;
  title: string;
  label: string;
  signature: string;
  chapter: string;
  timeband: string;
  dateLabel: string;
  summary: string;
  detail: string;
  tags: string[];
  transcript: string;
};

const COLORS = ["#ffd27a", "#9ad1ff", "#ff9ac6", "#b7ffb0", "#ffffff"] as const;

export function generateStars(count = 1400, seed = "urai-tier1"): StarRecord[] {
  const rng = seedrandom(seed);

  return Array.from({ length: count }, (_, i) => {
    const radius = 300 + rng() * 900;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const color = COLORS[Math.floor(rng() * COLORS.length)];
    const metadata = getMemoryMetadata(i);

    return {
      id: `star-${i}`,
      position: [x, y, z] as [number, number, number],
      size: 0.6 + rng() * 1.8,
      color,
      ...metadata,
    };
  });
}
