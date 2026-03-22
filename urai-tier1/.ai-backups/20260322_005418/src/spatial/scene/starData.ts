import * as THREE from "three";

export type StarLayer = "far" | "mid" | "near";

export type StarDatum = {
  id: string;
  position: [number, number, number];
  layer: StarLayer;
  interactive: boolean;
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(424242);

function range(min: number, max: number): number {
  return min + (max - min) * rand();
}

function makeStars(): StarDatum[] {
  const stars: StarDatum[] = [];

  for (let i = 0; i < 220; i += 1) {
    stars.push({
      id: `far_${i}`,
      layer: "far",
      interactive: false,
      position: [
        range(-60, 60),
        range(-10, 38),
        range(-140, -35),
      ],
    });
  }

  for (let i = 0; i < 70; i += 1) {
    stars.push({
      id: `mid_${i}`,
      layer: "mid",
      interactive: i < 18,
      position: [
        range(-34, 34),
        range(-4, 24),
        range(-70, -18),
      ],
    });
  }

  for (let i = 0; i < 20; i += 1) {
    stars.push({
      id: `near_${i}`,
      layer: "near",
      interactive: i < 8,
      position: [
        range(-22, 22),
        range(2, 18),
        range(-28, -10),
      ],
    });
  }

  return stars;
}

export const STAR_DATA: StarDatum[] = makeStars();

export function getStarPosition(id: string | null): THREE.Vector3 | null {
  if (!id) return null;
  const match = STAR_DATA.find((s) => s.id === id);
  if (!match) return null;
  const [x, y, z] = match.position;
  return new THREE.Vector3(x, y, z);
}
