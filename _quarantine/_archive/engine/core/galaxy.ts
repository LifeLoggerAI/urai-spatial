import * as THREE from "three"

export type StarPoint = {
  id: number
  position: [number, number, number]
}

/**
 * Creates a deterministic spiral galaxy with multiple arms.
 * @param seed Number seed for repeatable layout
 * @param count Total number of stars
 * @returns Array of StarPoint objects
 */
export function createGalaxy(seed: number, count: number): StarPoint[] {

  const stars: StarPoint[] = []
  const arms = 4
  const radius = 520
  const spread = 22
  const heightRange = 40

  // Simple deterministic PRNG based on index and seed
  function rand(n: number) {
    const x = Math.sin((n + seed) * 999.91) * 43758.5453
    return x - Math.floor(x)
  }

  for (let i = 0; i < count; i++) {

    const arm = i % arms
    const t = i / count

    // Spiral angle for this star along its arm
    const angle = t * Math.PI * 8 + (arm * Math.PI * 2) / arms

    // Radial distance from galaxy center
    const r = Math.pow(rand(i * 7.1), 0.7) * radius

    // Cartesian coordinates with some spread/noise
    const x = Math.cos(angle) * r + (rand(i * 13.1) - 0.5) * spread
    const z = Math.sin(angle) * r + (rand(i * 17.7) - 0.5) * spread
    const y = (rand(i * 23.9) - 0.5) * heightRange

    stars.push({
      id: i,
      position: [x, y, z],
    })
  }

  return stars
}