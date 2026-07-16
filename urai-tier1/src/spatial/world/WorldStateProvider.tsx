'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  definitionForDestination,
  destinationForPathname,
} from './destinationRegistry'
import {
  INITIAL_URAI_WORLD_STATE,
  type UraiDestination,
  type UraiPrivacyMode,
  type UraiWorldContextPatch,
  type UraiWorldState,
  type UraiWorldTravelRequest,
} from './worldTypes'

export type UraiTransitionPhase = 'idle' | 'descending' | 'ascending' | 'travelling'

type RuntimeState = {
  world: UraiWorldState
  phase: UraiTransitionPhase
  pendingTravel?: UraiWorldTravelRequest
}

type RuntimeAction =
  | { type: 'SYNC_ROUTE'; destination: UraiDestination; context: UraiWorldContextPatch }
  | { type: 'BEGIN_TRAVEL'; request: UraiWorldTravelRequest; phase: UraiTransitionPhase }
  | { type: 'CANCEL_TRANSITION' }
  | { type: 'PATCH_CONTEXT'; patch: UraiWorldContextPatch }

type UraiWorldContextValue = RuntimeState & {
  beginTravel: (request: UraiWorldTravelRequest) => void
  cancelTransition: () => void
  patchContext: (patch: UraiWorldContextPatch) => void
}

const UraiWorldContext = createContext<UraiWorldContextValue | null>(null)

function privacyModeFrom(value: string | null): UraiPrivacyMode | undefined {
  if (value === 'private' || value === 'revealing' || value === 'held-private') return value
  return undefined
}

function contextFromLocation(): UraiWorldContextPatch {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const memoryId = params.get('memoryId') ?? params.get('node') ?? undefined
  const threadId = params.get('thread') ?? undefined
  const personId = params.get('personId') ?? undefined
  const placeId = params.get('placeId') ?? undefined
  const replayManifestId = params.get('manifestId') ?? undefined
  const privacyMode = privacyModeFrom(params.get('privacyMode') ?? params.get('state'))
  const entryPortal = params.get('entryPortal') ?? params.get('from') ?? undefined

  return {
    ...(memoryId ? { memoryId } : {}),
    ...(threadId ? { threadId } : {}),
    ...(personId ? { personId } : {}),
    ...(placeId ? { placeId } : {}),
    ...(replayManifestId ? { replayManifestId } : {}),
    ...(privacyMode ? { privacyMode } : {}),
    ...(entryPortal ? { entryPortal } : {}),
  }
}

function initialRuntimeState(pathname: string): RuntimeState {
  const destination = destinationForPathname(pathname) ?? INITIAL_URAI_WORLD_STATE.destination
  const definition = definitionForDestination(destination)
  return {
    world: {
      ...INITIAL_URAI_WORLD_STATE,
      destination,
      layer: definition.layer,
      entryPortal: definition.entryPortal,
      cameraCheckpoint: definition.cameraCheckpoint,
    },
    phase: 'idle',
  }
}

function reducer(state: RuntimeState, action: RuntimeAction): RuntimeState {
  if (action.type === 'SYNC_ROUTE') {
    const definition = definitionForDestination(action.destination)
    const changed = state.world.destination !== action.destination
    return {
      phase: 'idle',
      pendingTravel: undefined,
      world: {
        ...state.world,
        ...action.context,
        destination: action.destination,
        previousDestination: changed ? state.world.destination : state.world.previousDestination,
        layer: definition.layer,
        entryPortal: action.context.entryPortal ?? state.pendingTravel?.entryPortal ?? state.world.entryPortal ?? definition.entryPortal,
        cameraCheckpoint:
          action.context.cameraCheckpoint ??
          state.pendingTravel?.cameraCheckpoint ??
          definition.cameraCheckpoint,
      },
    }
  }

  if (action.type === 'BEGIN_TRAVEL') {
    return {
      ...state,
      phase: action.phase,
      pendingTravel: action.request,
      world: {
        ...state.world,
        ...action.request.context,
        previousDestination: state.world.destination,
        layer: 'transition',
        entryPortal: action.request.entryPortal ?? state.world.entryPortal,
        cameraCheckpoint: action.request.cameraCheckpoint ?? state.world.cameraCheckpoint,
      },
    }
  }

  if (action.type === 'PATCH_CONTEXT') {
    return { ...state, world: { ...state.world, ...action.patch } }
  }

  return {
    ...state,
    phase: 'idle',
    pendingTravel: undefined,
    world: {
      ...state.world,
      layer: definitionForDestination(state.world.destination).layer,
    },
  }
}

function transitionPhaseFor(state: UraiWorldState, destination: UraiDestination): UraiTransitionPhase {
  if (state.destination === 'home' && destination === 'infrastructure-hub') return 'descending'
  if (state.layer === 'infrastructure-world' && destination === 'home') return 'ascending'
  return 'travelling'
}

export function UraiWorldStateProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [runtime, dispatch] = useReducer(reducer, pathname, initialRuntimeState)

  useEffect(() => {
    const destination = destinationForPathname(pathname)
    if (!destination) return
    dispatch({ type: 'SYNC_ROUTE', destination, context: contextFromLocation() })
  }, [pathname])

  const beginTravel = useCallback((request: UraiWorldTravelRequest) => {
    dispatch({
      type: 'BEGIN_TRAVEL',
      request,
      phase: transitionPhaseFor(runtime.world, request.destination),
    })
  }, [runtime.world])

  const cancelTransition = useCallback(() => dispatch({ type: 'CANCEL_TRANSITION' }), [])
  const patchContext = useCallback((patch: UraiWorldContextPatch) => dispatch({ type: 'PATCH_CONTEXT', patch }), [])

  const value = useMemo<UraiWorldContextValue>(() => ({
    ...runtime,
    beginTravel,
    cancelTransition,
    patchContext,
  }), [beginTravel, cancelTransition, patchContext, runtime])

  return <UraiWorldContext.Provider value={value}>{children}</UraiWorldContext.Provider>
}

export function useUraiWorldState() {
  const context = useContext(UraiWorldContext)
  if (!context) throw new Error('useUraiWorldState must be used inside UraiWorldStateProvider')
  return context
}
