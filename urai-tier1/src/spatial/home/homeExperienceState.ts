export type HomeStableState =
  | 'HOME_PRESENTATION'
  | 'AVATAR_HOME_FIRST_PERSON'
  | 'AVATAR_SELF_VIEW'
  | 'IMMERSIVE_CONVERSATION'

export type HomeDestination = 'GROUND' | 'LIFE_MAP'
export type HomeReturnDestination = HomeDestination | 'PASSPORT'

export type HomeTransitionState =
  | 'AVATAR_EMBODIMENT_TRANSITION'
  | 'EMBODIMENT_UNWIND'
  | 'GROUND_DESCENT'
  | 'GROUND_UNWIND'
  | 'SKY_ASCENT'
  | 'LIFE_MAP_UNWIND'
  | 'ORB_TRANSFORMATION'
  | 'ORB_COLLAPSE'
  | 'HOME_RESTORE'
  | 'ERROR_RECOVERY'

export type HomeVec3 = readonly [number, number, number]

export type HomeEnvironmentSnapshot = {
  timeKey?: string
  weatherKey?: string
  lightingKey?: string
  environmentRevision?: string
}

export type HomeCameraSnapshot = {
  position: HomeVec3
  yaw: number
  pitch: number
}

export type HomeOriginSnapshot = {
  stableState: Extract<HomeStableState, 'HOME_PRESENTATION' | 'AVATAR_HOME_FIRST_PERSON'>
  camera: HomeCameraSnapshot
  environment: HomeEnvironmentSnapshot
  orbState?: string
  capturedAt: number
}

export type HomeReturnFrame = {
  kind: 'local' | 'destination'
  destination?: HomeReturnDestination
  origin: HomeOriginSnapshot
}

export type HomeExperienceState = {
  stableState: HomeStableState
  transition: HomeTransitionState | null
  returnStack: readonly HomeReturnFrame[]
  origin: HomeOriginSnapshot
  inputLocked: boolean
  pendingDestination: HomeDestination | null
  reducedMotion: boolean
}

export type HomeExperienceEvent =
  | { type: 'AVATAR_ACTIVATE'; snapshot: HomeOriginSnapshot }
  | { type: 'EMBODIMENT_COMPLETE'; snapshot: HomeOriginSnapshot }
  | { type: 'SELF_VIEW_OPEN' }
  | { type: 'SELF_VIEW_CLOSE' }
  | { type: 'GROUND_ACTIVATE'; snapshot: HomeOriginSnapshot }
  | { type: 'SKY_ACTIVATE'; snapshot: HomeOriginSnapshot }
  | { type: 'ORB_ACTIVATE'; snapshot: HomeOriginSnapshot }
  | { type: 'TRANSITION_COMPLETE' }
  | { type: 'DESTINATION_RETURN'; destination: HomeReturnDestination; snapshot?: HomeOriginSnapshot }
  | { type: 'ESCAPE' }
  | { type: 'HOME_RESTORE_COMPLETE' }
  | { type: 'RECOVER'; snapshot?: HomeOriginSnapshot }
  | { type: 'SET_REDUCED_MOTION'; value: boolean }

export const HOME_RETURN_SESSION_KEY = 'urai:home:return-frame:v1'
export const HOME_PASSPORT_ORIGIN_CAPTURE_EVENT = 'urai:home-passport-origin-capture' as const

export const DEFAULT_HOME_PRESENTATION_CAMERA: HomeCameraSnapshot = {
  position: [0, 1.75, 7.85],
  yaw: 0,
  pitch: 0.02,
}

export function makeHomeOriginSnapshot(
  stableState: HomeOriginSnapshot['stableState'],
  camera: HomeCameraSnapshot = DEFAULT_HOME_PRESENTATION_CAMERA,
  environment: HomeEnvironmentSnapshot = {},
  orbState = 'idle',
  capturedAt = Date.now(),
): HomeOriginSnapshot {
  return { stableState, camera, environment, orbState, capturedAt }
}

export function createInitialHomeExperienceState(
  reducedMotion = false,
  origin = makeHomeOriginSnapshot('AVATAR_HOME_FIRST_PERSON'),
): HomeExperienceState {
  return {
    stableState: 'AVATAR_HOME_FIRST_PERSON',
    transition: null,
    returnStack: [],
    origin,
    inputLocked: false,
    pendingDestination: null,
    reducedMotion,
  }
}

function pushReturnFrame(
  state: HomeExperienceState,
  frame: HomeReturnFrame,
): readonly HomeReturnFrame[] {
  return [...state.returnStack, frame]
}

function popReturnFrame(state: HomeExperienceState) {
  const frame = state.returnStack[state.returnStack.length - 1]
  return {
    frame,
    stack: frame ? state.returnStack.slice(0, -1) : state.returnStack,
  }
}

function canActivateWorldSurface(state: HomeExperienceState) {
  return !state.transition
    && (state.stableState === 'HOME_PRESENTATION' || state.stableState === 'AVATAR_HOME_FIRST_PERSON')
}

export function homeExperienceReducer(
  state: HomeExperienceState,
  event: HomeExperienceEvent,
): HomeExperienceState {
  switch (event.type) {
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: event.value }

    case 'AVATAR_ACTIVATE':
      if (state.stableState !== 'HOME_PRESENTATION' || state.transition) return state
      return {
        ...state,
        origin: event.snapshot,
        transition: 'AVATAR_EMBODIMENT_TRANSITION',
        inputLocked: true,
      }

    case 'EMBODIMENT_COMPLETE':
      if (state.transition !== 'AVATAR_EMBODIMENT_TRANSITION') return state
      return {
        ...state,
        stableState: 'AVATAR_HOME_FIRST_PERSON',
        transition: null,
        origin: event.snapshot,
        inputLocked: false,
      }

    case 'SELF_VIEW_OPEN':
      if (state.stableState !== 'AVATAR_HOME_FIRST_PERSON' || state.transition) return state
      return { ...state, stableState: 'AVATAR_SELF_VIEW', inputLocked: true }

    case 'SELF_VIEW_CLOSE':
      if (state.stableState !== 'AVATAR_SELF_VIEW') return state
      return { ...state, stableState: 'AVATAR_HOME_FIRST_PERSON', inputLocked: false }

    case 'GROUND_ACTIVATE':
      if (!canActivateWorldSurface(state)) return state
      return {
        ...state,
        origin: event.snapshot,
        transition: 'GROUND_DESCENT',
        returnStack: pushReturnFrame(state, {
          kind: 'destination',
          destination: 'GROUND',
          origin: event.snapshot,
        }),
        pendingDestination: 'GROUND',
        inputLocked: true,
      }

    case 'SKY_ACTIVATE':
      if (!canActivateWorldSurface(state)) return state
      return {
        ...state,
        origin: event.snapshot,
        transition: 'SKY_ASCENT',
        returnStack: pushReturnFrame(state, {
          kind: 'destination',
          destination: 'LIFE_MAP',
          origin: event.snapshot,
        }),
        pendingDestination: 'LIFE_MAP',
        inputLocked: true,
      }

    case 'ORB_ACTIVATE':
      if (!canActivateWorldSurface(state)) return state
      return {
        ...state,
        origin: event.snapshot,
        transition: 'ORB_TRANSFORMATION',
        returnStack: pushReturnFrame(state, { kind: 'local', origin: event.snapshot }),
        inputLocked: true,
      }

    case 'TRANSITION_COMPLETE':
      if (state.transition === 'ORB_TRANSFORMATION') {
        return {
          ...state,
          stableState: 'IMMERSIVE_CONVERSATION',
          transition: null,
          inputLocked: false,
        }
      }
      return state

    case 'DESTINATION_RETURN': {
      const { frame, stack } = popReturnFrame(state)
      const returnedOrigin = event.snapshot ?? frame?.origin ?? state.origin
      const origin = returnedOrigin.stableState === 'HOME_PRESENTATION'
        ? { ...returnedOrigin, stableState: 'AVATAR_HOME_FIRST_PERSON' as const }
        : returnedOrigin
      const transition = event.destination === 'GROUND'
        ? 'GROUND_UNWIND'
        : event.destination === 'LIFE_MAP'
          ? 'LIFE_MAP_UNWIND'
          : 'HOME_RESTORE'
      return {
        ...state,
        stableState: origin.stableState,
        transition,
        returnStack: stack,
        origin,
        pendingDestination: null,
        inputLocked: true,
      }
    }

    case 'ESCAPE': {
      if (state.stableState === 'AVATAR_SELF_VIEW') {
        return { ...state, stableState: 'AVATAR_HOME_FIRST_PERSON', inputLocked: false }
      }

      if (state.stableState === 'IMMERSIVE_CONVERSATION') {
        const { frame, stack } = popReturnFrame(state)
        const origin = frame?.origin ?? state.origin
        return {
          ...state,
          stableState: origin.stableState,
          transition: 'ORB_COLLAPSE',
          returnStack: stack,
          origin,
          inputLocked: true,
        }
      }

      if (state.transition === 'AVATAR_EMBODIMENT_TRANSITION') {
        return {
          ...state,
          stableState: 'HOME_PRESENTATION',
          transition: 'HOME_RESTORE',
          pendingDestination: null,
          inputLocked: true,
        }
      }

      if (state.transition === 'GROUND_DESCENT' || state.transition === 'SKY_ASCENT') {
        const { frame, stack } = popReturnFrame(state)
        const origin = frame?.origin ?? state.origin
        return {
          ...state,
          stableState: origin.stableState,
          transition: 'HOME_RESTORE',
          returnStack: stack,
          origin,
          pendingDestination: null,
          inputLocked: true,
        }
      }

      if (state.stableState === 'AVATAR_HOME_FIRST_PERSON' && !state.transition) {
        return state
      }

      return state
    }

    case 'HOME_RESTORE_COMPLETE':
      if (
        state.transition !== 'HOME_RESTORE'
        && state.transition !== 'EMBODIMENT_UNWIND'
        && state.transition !== 'GROUND_UNWIND'
        && state.transition !== 'LIFE_MAP_UNWIND'
        && state.transition !== 'ORB_COLLAPSE'
      ) return state
      return {
        ...state,
        stableState: state.transition === 'EMBODIMENT_UNWIND' ? 'AVATAR_HOME_FIRST_PERSON' : state.stableState,
        transition: null,
        inputLocked: false,
        pendingDestination: null,
      }

    case 'RECOVER': {
      const recovered = event.snapshot ?? state.origin
      const origin = recovered.stableState === 'HOME_PRESENTATION'
        ? { ...recovered, stableState: 'AVATAR_HOME_FIRST_PERSON' as const }
        : recovered
      return {
        ...createInitialHomeExperienceState(state.reducedMotion, origin),
        stableState: origin.stableState,
      }
    }

    default:
      return state
  }
}

export function serializeHomeReturnFrame(frame: HomeReturnFrame): string {
  return JSON.stringify(frame)
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

export function parseHomeReturnFrame(value: string | null): HomeReturnFrame | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<HomeReturnFrame>
    if (parsed.kind !== 'local' && parsed.kind !== 'destination') return null
    if (
      parsed.kind === 'destination'
      && parsed.destination !== 'GROUND'
      && parsed.destination !== 'LIFE_MAP'
      && parsed.destination !== 'PASSPORT'
    ) return null
    if (parsed.kind === 'local' && parsed.destination !== undefined) return null
    if (!parsed.origin || (parsed.origin.stableState !== 'HOME_PRESENTATION' && parsed.origin.stableState !== 'AVATAR_HOME_FIRST_PERSON')) return null

    const camera = parsed.origin.camera
    if (!camera || !Array.isArray(camera.position) || camera.position.length !== 3) return null
    if (!camera.position.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) return null
    if (!Number.isFinite(camera.yaw) || !Number.isFinite(camera.pitch)) return null
    if (!Number.isFinite(parsed.origin.capturedAt) || parsed.origin.capturedAt < 0) return null
    if (parsed.origin.orbState !== undefined && typeof parsed.origin.orbState !== 'string') return null

    const environment = parsed.origin.environment
    if (!environment || typeof environment !== 'object') return null
    if (!isOptionalString(environment.timeKey)) return null
    if (!isOptionalString(environment.weatherKey)) return null
    if (!isOptionalString(environment.lightingKey)) return null
    if (!isOptionalString(environment.environmentRevision)) return null

    return parsed as HomeReturnFrame
  } catch {
    return null
  }
}

export function persistHomeReturnFrame(frame: HomeReturnFrame) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(HOME_RETURN_SESSION_KEY, serializeHomeReturnFrame(frame)) } catch { /* storage is best effort */ }
}

export function consumeHomeReturnFrame(): HomeReturnFrame | null {
  if (typeof window === 'undefined') return null
  try {
    const frame = parseHomeReturnFrame(window.sessionStorage.getItem(HOME_RETURN_SESSION_KEY))
    window.sessionStorage.removeItem(HOME_RETURN_SESSION_KEY)
    return frame
  } catch {
    return null
  }
}
