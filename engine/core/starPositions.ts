import * as THREE from "three"

export const STAR_COUNT = 1200

export function generateStars(): THREE.Vector3[] {
  const stars: THREE.Vector3[] = []

  const radius = 250

  for (let i = 0; i < STAR_COUNT; i++) {
    const r = radius * Math.cbrt(Math.random())
    const theta = Math.random() * 2 * Math.PI
    const phi = Math.acos(2 * Math.random() - 1)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    stars.push(new THREE.Vector3(x, y, z))
  }

  return stars
}
