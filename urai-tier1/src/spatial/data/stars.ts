import seedrandom from "seedrandom";

export type StarRecord = {
  id: string;
  position: [number, number, number];
  size: number;
  color: string;
};

const COLORS = ["#ffd27a", "#9ad1ff", "#ff9ac6", "#b7ffb0", "#ffffff"];

export function generateStars(count = 400, seed = "urai-tier1"): StarRecord[] {
  const rng = seedrandom(seed);

  return Array.from({ length: count }, (_, i) => {
    const radius = 300 + rng() * 900;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return {
      id: `star-${i}`,
      position: [x, y, z] as [number, number, number],
      size: 0.6 + rng() * 1.8,
      color: COLORS[Math.floor(rng() * COLORS.length)],
    };
  });
}
