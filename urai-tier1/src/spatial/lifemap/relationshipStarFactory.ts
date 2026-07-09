import type { MemoryStarRelationship } from './memoryStarRelationships'
import { resolveMemoryStarAppearance } from './memoryStarRelationships'

export type RenderableMemoryStar = {
  id: string
  position: [number, number, number]
  brightness: number
  connected: string[]
  themes: string[]
}

export function createRelationshipDrivenStar(
  memory: MemoryStarRelationship,
  position: [number, number, number],
): RenderableMemoryStar {
  const appearance = resolveMemoryStarAppearance(memory)

  return {
    id: memory.id,
    position,
    brightness: appearance.brightness,
    connected: memory.connectedStars,
    themes: appearance.relationships,
  }
}

export function createConstellation(stars: RenderableMemoryStar[]) {
  return stars.flatMap((star) => star.connected.map((connection) => ({
    from: star.id,
    to: connection,
  })))
}
