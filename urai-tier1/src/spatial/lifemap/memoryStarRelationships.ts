export const URAI_LIFEMAP_CONTRACT_VERSION = 'urai-memory-star-relationships-v1' as const

export type MemoryStarRelationship = {
  id: string
  period: string
  themes: string[]
  connectedStars: string[]
  emotionalWeight: number
  distance: number
}

export function resolveMemoryStarAppearance(star: MemoryStarRelationship) {
  return {
    contract: URAI_LIFEMAP_CONTRACT_VERSION,
    brightness: Math.max(0.1, Math.min(1, star.emotionalWeight)),
    depth: Math.max(0, Math.min(1, star.distance)),
    constellation: star.connectedStars.length > 0,
    relationships: star.themes,
  }
}

export function selectMemoryStar(star: MemoryStarRelationship) {
  return {
    selected: star.id,
    sequence: [
      'soften-neighbors',
      'brighten-selected-star',
      'camera-approach',
      'increase-depth',
      'enter-focus-or-replay',
    ],
  }
}
