import type { MemoryStarRelationship } from './memoryStarRelationships'
import { createRelationshipDrivenStar, createConstellation } from './relationshipStarFactory'
import { createMemoryJourney } from '../world/memoryJourneyController'

export function buildRelationshipLifeMap(stars: Array<MemoryStarRelationship>) {
  const renderedStars = stars.map((star, index) => createRelationshipDrivenStar(
    star,
    [index * 12 - stars.length * 6, 18 + (index % 3) * 8, -220],
  ))

  return {
    stars: renderedStars,
    constellations: createConstellation(renderedStars),
  }
}

export function onRelationshipStarSelected(star: MemoryStarRelationship) {
  return createMemoryJourney(star)
}
