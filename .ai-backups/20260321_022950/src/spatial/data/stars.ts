import { SpatialStar } from "../types";

export const stars: SpatialStar[] = Array.from({ length: 120 }).map((_, i) => ({
  id: `star_${i}`,
  position: [
    (Math.random() - 0.5) * 80,
    (Math.random() - 0.5) * 60,
    -Math.random() * 120
  ],
  color: `hsl(${200 + Math.random() * 120}, 70%, 65%)`,
  size: 0.4 + Math.random() * 0.6,
  label: `Memory ${i + 1}`,
  chapter: "Life",
  timeband: "Now",
  signature: "Core"
}));
