export type SeededRng = () => number;

export function hashStringToSeed(input: string): number {
  let h = 1779033703 ^ input.length;

  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return h >>> 0;
}

export function mulberry32(seed: number): SeededRng {
  let t = seed >>> 0;

  return function (): number {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string | number = "urai-tier1"): SeededRng {
  const numericSeed = typeof seed === "number" ? seed >>> 0 : hashStringToSeed(seed);
  return mulberry32(numericSeed);
}

export function seededRandom(seed: string | number = "urai-tier1"): SeededRng {
  return createSeededRandom(seed);
}

export function randomBetween(rng: SeededRng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export default createSeededRandom;
