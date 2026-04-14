export type Phase = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'
export type UraiPhase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
export type Tier1Mode = UraiPhase

export type TransitionPhase = 'idle' | 'ascent' | 'focus' | 'replay' | 'unwind'

export type Tier1State = {
  phase: UraiPhase
  mode: Phase
  transitionPhase: TransitionPhase
  transitionLock: boolean
  transitioning: boolean
  hoveredStarId: string | null
  selectedStarId: string | null
  replayStarId: string | null
}

export type Tier1Action =
  | { type: 'BEGIN_ASCENT' }
  | { type: 'ARRIVE_LIFEMAP' }
  | { type: 'SET_HOVERED_STAR'; starId: string | null }
  | { type: 'OPEN_FOCUS'; starId: string }
  | { type: 'CLOSE_FOCUS' }
  | { type: 'OPEN_REPLAY'; starId: string }
  | { type: 'CLOSE_REPLAY' }
  | { type: 'END_TRANSITION' }
  | { type: 'ESC' }

export const VALID_TRANSITIONS: Record<Phase, Phase[]> = {
  home: ['ascent'],
  ascent: ['lifemap'],
  lifemap: ['focus'],
  focus: ['replay', 'lifemap'],
  replay: ['focus'],
}

export function phaseToMode(p: Phase): Tier1Mode {
  switch (p) {
    case 'home': return 'HOME'
    case 'ascent': return 'ASCENT'
    case 'lifemap': return 'LIFEMAP'
    case 'focus': return 'FOCUS'
    case 'replay': return 'REPLAY'
  }
}

export function modeToPhase(m: Tier1Mode | UraiPhase): Phase {
  switch (m) {
    case 'HOME': return 'home'
    case 'ASCENT': return 'ascent'
    case 'LIFEMAP': return 'lifemap'
    case 'FOCUS': return 'focus'
    case 'REPLAY': return 'replay'
  }
}

function normalizePhase(input: Phase | UraiPhase): Phase {
  return input === 'HOME' || input === 'ASCENT' || input === 'LIFEMAP' || input === 'FOCUS' || input === 'REPLAY'
    ? modeToPhase(input)
    : input
}

export function assertTransition(from: Phase, to: Phase) {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`ILLEGAL TRANSITION: ${from} → ${to}`)
  }
}

export function assertLegalTransition(from: Phase | UraiPhase, to: Phase | UraiPhase) {
  return assertTransition(normalizePhase(from), normalizePhase(to))
}

export const INITIAL_TIER1_STATE: Tier1State = {
  phase: 'HOME',
  mode: 'home',
  transitionPhase: 'idle',
  transitionLock: false,
  transitioning: false,
  hoveredStarId: null,
  selectedStarId: null,
  replayStarId: null,
}

export const INITIAL_URAI_RUNTIME_STATE = INITIAL_TIER1_STATE
export const initialCanonState = INITIAL_TIER1_STATE
export const initialUraiState = INITIAL_TIER1_STATE

export function isTransitioningState(state?: Partial<Tier1State> | null) {
  return !!state && (state.transitioning === true || state.transitionLock === true || state.transitionPhase !== 'idle')
}

export function getPhaseDurationMs(phase?: TransitionPhase) {
  switch (phase) {
    case 'ascent': return 1600
    case 'focus': return 900
    case 'replay': return 1200
    case 'unwind': return 700
    default: return 0
  }
}

export function resolveEscTarget(phase: Phase | UraiPhase): UraiPhase {
  switch (normalizePhase(phase)) {
    case 'replay': return 'FOCUS'
    case 'focus': return 'LIFEMAP'
    case 'lifemap': return 'HOME'
    case 'ascent': return 'HOME'
    case 'home': return 'HOME'
  }
}

function withPhase(state: Tier1State, mode: Phase): Tier1State {
  return {
    ...state,
    mode,
    phase: phaseToMode(mode),
  }
}

export function tier1Reducer(state: Tier1State, action: Tier1Action): Tier1State {
  switch (action.type) {
    case 'BEGIN_ASCENT': {
      if (state.mode !== 'home' || state.transitionLock) return state
      assertLegalTransition('home', 'ascent')
      return {
        ...withPhase(state, 'ascent'),
        transitionPhase: 'ascent',
        transitionLock: true,
        transitioning: true,
        hoveredStarId: null,
      }
    }

    case 'ARRIVE_LIFEMAP': {
      if (state.mode !== 'ascent') return state
      assertLegalTransition('ascent', 'lifemap')
      return {
        ...withPhase(state, 'lifemap'),
        transitionPhase: 'idle',
        transitionLock: false,
        transitioning: false,
      }
    }

    case 'SET_HOVERED_STAR': {
      if (state.mode !== 'lifemap' || state.transitionLock) return state
      return {
        ...state,
        hoveredStarId: action.starId,
      }
    }

    case 'OPEN_FOCUS': {
      if (state.mode !== 'lifemap' || state.transitionLock) return state
      assertLegalTransition('lifemap', 'focus')
      return {
        ...withPhase(state, 'focus'),
        transitionPhase: 'focus',
        transitionLock: true,
        transitioning: true,
        selectedStarId: action.starId,
        replayStarId: null,
      }
    }

      case 'OPEN_REPLAY': {
        if (state.mode !== 'focus') return state
        if (!action.starId || !state.selectedStarId) return state
        if (action.starId !== state.selectedStarId) return state
        if (state.transitionLock) return state
        assertLegalTransition('focus', 'replay')
        return {
          ...withPhase(state, 'replay'),
          replayStarId: action.starId,
          transitionPhase: 'replay',
          transitionLock: true,
          transitioning: true,
        }
      }

    case 'CLOSE_REPLAY': {
      if (state.mode !== 'replay' || state.transitionLock) return state
      assertLegalTransition('replay', 'focus')
      return {
        ...withPhase(state, 'focus'),
        transitionPhase: 'unwind',
        transitionLock: true,
        transitioning: true,
        replayStarId: null,
      }
    }

    case 'CLOSE_FOCUS': {
      if (state.mode !== 'focus' || state.transitionLock) return state
      return {
        ...withPhase(state, 'lifemap'),
        transitionPhase: 'unwind',
        transitionLock: true,
        transitioning: true,
      }
    }

    case 'ESC': {
      if (state.transitionLock) return state

      if (state.mode === 'replay') {
        return {
          ...withPhase(state, 'focus'),
          transitionPhase: 'unwind',
          transitionLock: true,
          transitioning: true,
          replayStarId: null,
        }
      }

      if (state.mode === 'focus') {
        return {
          ...withPhase(state, 'lifemap'),
          transitionPhase: 'unwind',
          transitionLock: true,
          transitioning: true,
        }
      }

      if (state.mode === 'lifemap' || state.mode === 'ascent') {
        return {
          ...withPhase(state, 'home'),
          transitionPhase: 'unwind',
          transitionLock: true,
          transitioning: true,
          hoveredStarId: null,
          selectedStarId: null,
          replayStarId: null,
        }
      }

      return state
    }

    case 'END_TRANSITION': {
      return {
        ...state,
        transitionPhase: 'idle',
        transitionLock: false,
        transitioning: false,
      }
    }

    default:
      return state
  }
}

export function reduceRuntimeState(state: Tier1State, action: Tier1Action) {
  return tier1Reducer(state, action)
}

export function uraiReducer(state: Tier1State, action: Tier1Action) {
  return tier1Reducer(state, action)
}

export function makeStarNode() {
  return null
}
