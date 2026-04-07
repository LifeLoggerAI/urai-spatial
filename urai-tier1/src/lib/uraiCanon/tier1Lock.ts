export type Tier1Mode = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

export type Tier1TransitionPhase =
  | 'ascent'
  | 'arrive_lifemap'
  | 'open_focus'
  | 'close_focus'
  | 'open_replay'
  | 'close_replay'
  | 'go_home'
  | null

export type Tier1Visibility = {
  showHome: boolean
  showLifeMap: boolean
  showFocus: boolean
  showReplay: boolean
}

type VisibilityInput =
  | {
      mode?: Tier1Mode | null
      phase?: Tier1TransitionPhase | null
      transitionPhase?: Tier1TransitionPhase | null
    }
  | Tier1Mode
  | null
  | undefined

const VALID_PHASES = new Set<string>([
  'ascent',
  'arrive_lifemap',
  'open_focus',
  'close_focus',
  'open_replay',
  'close_replay',
  'go_home',
])

function normalizeMode(value: unknown): Tier1Mode {
  if (
    value === 'home' ||
    value === 'ascent' ||
    value === 'lifemap' ||
    value === 'focus' ||
    value === 'replay'
  ) {
    return value
  }
  return 'home'
}

function normalizePhase(value: unknown): Tier1TransitionPhase {
  if (typeof value === 'string' && VALID_PHASES.has(value)) return value as Tier1TransitionPhase
  return null
}

function unpackVisibilityInput(
  input?: VisibilityInput,
  maybePhase?: Tier1TransitionPhase | null
): { mode: Tier1Mode; phase: Tier1TransitionPhase } {
  if (typeof input === 'string' || input == null) {
    return {
      mode: normalizeMode(input),
      phase: normalizePhase(maybePhase),
    }
  }

  return {
    mode: normalizeMode(input.mode),
    phase: normalizePhase(input.transitionPhase ?? input.phase ?? maybePhase),
  }
}

export function shouldShowHome(mode: Tier1Mode, phase: Tier1TransitionPhase): boolean {
  return mode === 'home' || mode === 'ascent' || phase === 'go_home'
}

export function shouldShowLifeMap(mode: Tier1Mode, phase: Tier1TransitionPhase): boolean {
  return (
    mode === 'lifemap' ||
    mode === 'focus' ||
    phase === 'arrive_lifemap' ||
    phase === 'open_focus' ||
    phase === 'close_focus' ||
    phase === 'open_replay' ||
    phase === 'close_replay'
  )
}

export function shouldShowFocus(mode: Tier1Mode, phase: Tier1TransitionPhase): boolean {
  return (
    mode === 'focus' ||
    phase === 'open_focus' ||
    phase === 'close_focus' ||
    phase === 'open_replay' ||
    phase === 'close_replay'
  )
}

export function shouldShowReplay(mode: Tier1Mode, phase: Tier1TransitionPhase): boolean {
  return mode === 'replay' || phase === 'open_replay' || phase === 'close_replay'
}

export function resolveTier1Visibility(
  input?: VisibilityInput,
  maybePhase?: Tier1TransitionPhase | null
): Tier1Visibility {
  const { mode, phase } = unpackVisibilityInput(input, maybePhase)

  return {
    showHome: shouldShowHome(mode, phase),
    showLifeMap: shouldShowLifeMap(mode, phase),
    showFocus: shouldShowFocus(mode, phase),
    showReplay: shouldShowReplay(mode, phase),
  }
}

export function isHomeEnvelope(input?: VisibilityInput, maybePhase?: Tier1TransitionPhase | null): boolean {
  const { mode, phase } = unpackVisibilityInput(input, maybePhase)
  return shouldShowHome(mode, phase)
}

export function isLifeMapEnvelope(input?: VisibilityInput, maybePhase?: Tier1TransitionPhase | null): boolean {
  const { mode, phase } = unpackVisibilityInput(input, maybePhase)
  return shouldShowLifeMap(mode, phase)
}

export function isFocusEnvelope(input?: VisibilityInput, maybePhase?: Tier1TransitionPhase | null): boolean {
  const { mode, phase } = unpackVisibilityInput(input, maybePhase)
  return shouldShowFocus(mode, phase)
}

export function isReplayEnvelope(input?: VisibilityInput, maybePhase?: Tier1TransitionPhase | null): boolean {
  const { mode, phase } = unpackVisibilityInput(input, maybePhase)
  return shouldShowReplay(mode, phase)
}

export const getTier1Visibility = resolveTier1Visibility
export const computeTier1Visibility = resolveTier1Visibility
export const resolveVisibility = resolveTier1Visibility
export const resolveSceneVisibility = resolveTier1Visibility
export const getSceneVisibility = resolveTier1Visibility
export const resolveTier1Lock = resolveTier1Visibility
export const resolveTier1LockVisibility = resolveTier1Visibility
export const getTier1LockVisibility = resolveTier1Visibility
export const computeTier1LockVisibility = resolveTier1Visibility
export const tier1LockVisibility = resolveTier1Visibility

export default resolveTier1Visibility
