// Simple string → numeric hash
export function hashStringToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Deterministic pseudo-random generator
export function seededRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

// Main deterministic position generator
export function generateGalaxyPosition(
  id: string,
  chapterIndex: number,
  emotionalIntensity: number = 0.5
) {
  const seed = hashStringToSeed(id)
  const rand = seededRandom(seed)

  // Base spherical distribution
  const theta = rand() * 2 * Math.PI
  const phi = Math.acos(2 * rand() - 1)

  // Radial distance influenced by emotional intensity
  const baseRadius = 20 + emotionalIntensity * 15

  const x = baseRadius * Math.sin(phi) * Math.cos(theta)
  const y = baseRadius * Math.sin(phi) * Math.sin(theta)
  const z = baseRadius * Math.cos(phi)

  // Chapter clustering offset
  const chapterOffset = chapterIndex * 60

  return {
    x: x + chapterOffset,
    y,
    z
  }
}
