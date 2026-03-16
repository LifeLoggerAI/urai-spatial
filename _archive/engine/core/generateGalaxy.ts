export type StarPoint = {
  id: number
  position: [number, number, number]
}

/** Deterministic PRNG */
function mulberry32(seed: number) {
  let a = seed >>> 0

  return () => {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate a deterministic spiral galaxy */
export function generateGalaxy(seed: number, count: number): StarPoint[] {
  const rand = mulberry32(seed)
  const stars: StarPoint[] = []

  const arms = 4
  const radius = 500
  const twist = 10
  const spread = 20
  const height = 40

  for (let i = 0; i < count; i++) {
    const arm = i % arms
    const armOffset = (arm / arms) * Math.PI * 2

    const r = Math.pow(rand(), 0.72) * radius
    const spin = (r / radius) * twist
    const baseAngle = spin + armOffset

    const spreadScale = 0.2 + (r / radius) * 0.8

    const x =
      Math.cos(baseAngle) * r +
      (rand() - 0.5) * spread * spreadScale

    const z =
      Math.sin(baseAngle) * r +
      (rand() - 0.5) * spread * spreadScale

    const y =
      (rand() - 0.5) * height * (0.35 + 0.65 * spreadScale)

    stars.push({
      id: i,
      position: [x, y, z],
    })
  }

  return stars
}export type StarPoint = {
  id: number
  position: [number, number, number]
}

/** Deterministic PRNG */
function mulberry32(seed: number) {
  let a = seed >>> 0

  return () => {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generate a deterministic spiral galaxy */
export function generateGalaxy(seed: number, count: number): StarPoint[] {
  const rand = mulberry32(seed)
  const stars: StarPoint[] = []

  const arms = 4
  const radius = 500
  const twist = 10
  const spread = 20
  const height = 40

  for (let i = 0; i < count; i++) {
    const arm = i % arms
    const armOffset = (arm / arms) * Math.PI * 2

    const r = Math.pow(rand(), 0.72) * radius
    const spin = (r / radius) * twist
    const baseAngle = spin + armOffset

    const spreadScale = 0.2 + (r / radius) * 0.8

    const x =
      Math.cos(baseAngle) * r +
      (rand() - 0.5) * spread * spreadScale

    const z =
      Math.sin(baseAngle) * r +
      (rand() - 0.5) * spread * spreadScale

    const y =
      (rand() - 0.5) * height * (0.35 + 0.65 * spreadScale)

    stars.push({
      id: i,
      position: [x, y, z],
    })
  }

  return stars
}