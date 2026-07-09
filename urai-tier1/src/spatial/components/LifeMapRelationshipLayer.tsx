'use client'

import { createConstellation, createRelationshipDrivenStar } from '../lifemap/relationshipStarFactory'
import type { MemoryStarRelationship } from '../lifemap/memoryStarRelationships'

export function LifeMapRelationshipLayer({ stars }: { stars: MemoryStarRelationship[] }) {
  const rendered = stars.map((star, index) => createRelationshipDrivenStar(
    star,
    [index * 12 - stars.length * 6, 18 + (index % 4) * 7, -220],
  ))

  const edges = createConstellation(rendered)

  return {
    stars: rendered,
    edges,
    onSelect: (star: MemoryStarRelationship) => ({
      event: 'lifemap.star.select',
      star,
      journey: 'createMemoryJourney',
      camera: 'memoryApproach',
      destination: 'focus-or-replay',
    }),
  }
}
