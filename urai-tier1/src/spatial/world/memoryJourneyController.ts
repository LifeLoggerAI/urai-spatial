import { selectMemoryStar } from '../lifemap/memoryStarRelationships'
import { resolveCameraTransition } from '../camera/spatialCameraRig'

export type MemoryJourneyTarget = Parameters<typeof selectMemoryStar>[0]

export function createMemoryJourney(target: MemoryJourneyTarget) {
  return {
    selectedMemory: selectMemoryStar(target),
    camera: resolveCameraTransition({
      mode: 'memoryApproach',
      reducedMotion: false,
      intensity: 0.8,
    }),
    focusTransition: {
      from: 'life-map-starfield',
      through: 'selected-star',
      to: 'focus-or-replay',
    },
  }
}
