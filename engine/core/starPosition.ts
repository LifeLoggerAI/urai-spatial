export type StarPosition = {
  id: number
  position: [number, number, number]
}

function mulberry32(seed: number) {
  let a = seed

  return () => {
    let t = (a += 0x6D2B79F5)

    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateStarPositions(
  seed = 42,
  count = 20,
  width = 20,
  height = 14,
  depth = 6
): StarPosition[] {

  const rand = mulberry32(seed)

  const stars: StarPosition[] = []

  for (let i = 0; i < count; i++) {

    const x = (rand() - 0.5) * width
    const y = (rand() - 0.5) * height
    const z = -5 - rand() * depth

    stars.push({
      id: i,
      position: [x, y, z]
    })
  }

  return stars
}