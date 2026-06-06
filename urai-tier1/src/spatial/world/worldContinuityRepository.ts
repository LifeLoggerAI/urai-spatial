import {
  DEMO_WORLD_CONTINUITY_STATE,
  WorldContinuityState,
  markObjectInspected,
  markPlaceVisited,
  markReplayCompleted,
} from './worldContinuityState'

export type WorldContinuityRepositoryContext = {
  userId?: string | null
  source?: 'demo' | 'firestore' | 'fallback'
}

export type WorldContinuityRepository = {
  readCurrent(context?: WorldContinuityRepositoryContext): Promise<WorldContinuityState>
  markPlaceVisited(placeId: string, context?: WorldContinuityRepositoryContext): Promise<WorldContinuityState>
  markObjectInspected(objectId: string, context?: WorldContinuityRepositoryContext): Promise<WorldContinuityState>
  markReplayCompleted(replayId: string, context?: WorldContinuityRepositoryContext): Promise<WorldContinuityState>
}

let fallbackState = DEMO_WORLD_CONTINUITY_STATE

export const fallbackWorldContinuityRepository: WorldContinuityRepository = {
  async readCurrent() {
    return fallbackState
  },
  async markPlaceVisited(placeId) {
    fallbackState = markPlaceVisited(fallbackState, placeId)
    return fallbackState
  },
  async markObjectInspected(objectId) {
    fallbackState = markObjectInspected(fallbackState, objectId)
    return fallbackState
  },
  async markReplayCompleted(replayId) {
    fallbackState = markReplayCompleted(fallbackState, replayId)
    return fallbackState
  },
}

export function createWorldContinuityRepository(): WorldContinuityRepository {
  return fallbackWorldContinuityRepository
}
