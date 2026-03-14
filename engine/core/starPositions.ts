import * as THREE from "three"

export const STAR_COUNT = 1200
export const STAR_RADIUS = 250

function mulberry32(seed: number) {
  let a = seed
  return () => {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateStars(seed = 42): THREE.Vector3[] {

  const rand = mulberry32(seed)

  const stars: THREE.Vector3[] = []

  for (let i = 0; i < STAR_COUNT; i++) {

    const r = STAR_RADIUS * Math.cbrt(rand())
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    stars.push(new THREE.Vector3(x, y, z))
  }

  return stars
}