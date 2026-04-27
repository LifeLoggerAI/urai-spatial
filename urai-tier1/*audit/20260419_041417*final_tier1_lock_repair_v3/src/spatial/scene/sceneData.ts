import type { GroundObject, MemoryStar } from "./types";

export const GROUND_OBJECTS: GroundObject[] = [
  {
    id: "anchor",
    label: "Home",
    description: "World anchor",
    position: [-3.2, 0.86, -0.6],
    color: "#c8b596",
    shape: "box",
  },
  {
    id: "car",
    label: "Car",
    description: "Motion object",
    position: [3.25, 0.84, -0.4],
    color: "#6b95f0",
    shape: "car",
  },
  {
    id: "totem",
    label: "Totem",
    description: "Identity object",
    position: [4.9, 0.96, 1.4],
    color: "#c46a18",
    shape: "capsule",
  },
];

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = [
  "#d0bedf",
  "#b0d8d9",
  "#d8c99b",
  "#8fa7d4",
  "#c8b8d6",
  "#b8c7a4",
  "#b8d7ea",
  "#9c9ad0",
  "#d7a9bf",
];

export function generateStars(count = 42): MemoryStar[] {
  const rand = mulberry32(780221);
  const stars: MemoryStar[] = [];

  for (let i = 0; i < count; i += 1) {
    const side = rand() > 0.5 ? 1 : -1;
    const band = Math.floor(i / 14);
    const x = side * (4.8 + rand() * 8.2);
    const y = 1.2 + band * 1.1 + rand() * 2.0;
    const z = -10 - band * 4.4 - rand() * 12.0;
    const color = PALETTE[Math.floor(rand() * PALETTE.length)];
    const baseScale = 0.32 + rand() * 0.56;

    stars.push({
      position: [x, y, z],
      color,
      baseScale,
      category: i % 9 === 0 ? "milestone" : i % 4 === 0 ? "signal" : "memory",
    });
  }

  stars.push({
    id: "memory-78",
    position: [0.2, 1.85, -6.8],
    color: "#cfaed0",
    baseScale: 1.45,
    category: "milestone",
  });

  return stars;
}
