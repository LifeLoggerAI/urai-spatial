export type WorldContinuityState = {
  userId: string | null
  visitedPlaceIds: string[]
  completedReplayIds: string[]
  inspectedObjectIds: string[]
  hiddenObjectIds: string[]
  unlockedPortalIds: string[]
  enteredRealmIds: string[]
  updatedAt: string
}

export const DEMO_WORLD_CONTINUITY_STATE: WorldContinuityState = {
  userId: null,
  visitedPlaceIds: [],
  completedReplayIds: [],
  inspectedObjectIds: [],
  hiddenObjectIds: [],
  unlockedPortalIds: [],
  enteredRealmIds: [],
  updatedAt: '2026-05-21T00:00:00.000Z',
}

export function markPlaceVisited(state: WorldContinuityState, placeId: string): WorldContinuityState {
  return {
    ...state,
    visitedPlaceIds: Array.from(new Set([...state.visitedPlaceIds, placeId])),
    updatedAt: new Date().toISOString(),
  }
}

export function markReplayCompleted(state: WorldContinuityState, replayId: string): WorldContinuityState {
  return {
    ...state,
    completedReplayIds: Array.from(new Set([...state.completedReplayIds, replayId])),
    updatedAt: new Date().toISOString(),
  }
}

export function markObjectInspected(state: WorldContinuityState, objectId: string): WorldContinuityState {
  return {
    ...state,
    inspectedObjectIds: Array.from(new Set([...state.inspectedObjectIds, objectId])),
    updatedAt: new Date().toISOString(),
  }
}
