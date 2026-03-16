export type StarPoint = {
  id: number
  position: [number, number, number]
}

const ARMS = 4
const RADIUS = 520
const ARM_TWIST = 10.5
const HORIZONTAL_SPREAD = 22
const VERTICAL_SPREAD = 42

function seededRandom(seed: number, n: number) {
  const x = Math.sin((n + seed) * 999.91) * 43758.5453123
  return x - Math.floor(x)
}

export function spiralGalaxy(seed: number, count: number): StarPoint[] {

  const stars: StarPoint[] = []

  for (let i = 0; i < count; i++) {

    const arm = i % ARMS
    const t = i / count

    const radial = Math.pow(seededRandom(seed, i * 7.1), 0.62) * RADIUS

    const baseAngle =
      t * Math.PI * ARM_TWIST +
      (arm * Math.PI * 2) / ARMS

    const twist = (radial / RADIUS) * 2.4

    const angle = baseAngle + twist

    const spreadScale = 0.25 + (radial / RADIUS) * 0.75

    const x =
      Math.cos(angle) * radial +
      (seededRandom(seed, i * 13.1) - 0.5) * HORIZONTAL_SPREAD * spreadScale

    const z =
      Math.sin(angle) * radial +
      (seededRandom(seed, i * 17.7) - 0.5) * HORIZONTAL_SPREAD * spreadScale

    const y =
      (seededRandom(seed, i * 23.9) - 0.5) * VERTICAL_SPREAD * (0.35 + spreadScale * 0.65)

    stars.push({
      id: i,
      position: [x, y, z],
    })
  }

  return stars
}