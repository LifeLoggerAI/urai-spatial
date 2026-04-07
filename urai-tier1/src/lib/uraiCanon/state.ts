import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
import type {
  CanonAction,
  CanonState,
  StarNode,
  Tier1Mode,
  TransitionPhase,
  TransitionState,
  UraiCommand,
  UraiPhase,
  UraiRuntimeState,
  Vec3,
} from './types'

export type {
  CanonAction,
  CanonState,
  Tier1Mode,
  TransitionPhase,
  TransitionState,
  UraiCommand,
  UraiPhase,
  UraiRuntimeState,
  Vec3,
  StarNode,
} from './types'

const PHASE_TO_MODE: Record<UraiPhase, Tier1Mode> = {
  HOME: 'home',
  ASCENT: 'ascent',
  LIFEMAP: 'lifemap',
  FOCUS: 'focus',
  REPLAY: 'replay',
}

const LEGAL_TRANSITIONS: Record<UraiPhase, UraiPhase[]> = {
  HOME: ['ASCENT'],
  ASCENT: ['LIFEMAP'],
  LIFEMAP: ['FOCUS', 'HOME'],
  FOCUS: ['REPLAY', 'LIFEMAP'],
  REPLAY: ['FOCUS'],
}

function nowMs(): number {
  return uraiNow()
}

export function phaseToMode(phase: UraiPhase): Tier1Mode {
  return PHASE_TO_MODE[phase]
}

export function modeToPhase(mode: Tier1Mode): UraiPhase {
  if (mode === 'home') return 'HOME'
  if (mode === 'ascent') return 'ASCENT'
  if (mode === 'lifemap') return 'LIFEMAP'
  if (mode === 'focus') return 'FOCUS'
  return 'REPLAY'
}

export function assertLegalTransition(from: UraiPhase, to: UraiPhase): boolean {
  return Boolean(LEGAL_TRANSITIONS[from]?.includes(to))
}

export function isTransitioningState(
  state: Pick<UraiRuntimeState, 'isTransitioning' | 'transitioning' | 'inputLocked' | 'transitionLock' | 'transitionState'> | null | undefined
): boolean {
  return Boolean(
    state &&
      (
        state.isTransitioning ||
        state.transitioning ||
        state.inputLocked ||
        state.transitionLock ||
        state.transitionState !== 'idle'
      )
  )
}

export function getPhaseDurationMs(
  phase: UraiPhase,
  previousPhase: UraiPhase | null = null
): number {
  if (phase === 'ASCENT') return 2200
  if (phase === 'FOCUS' && previousPhase === 'LIFEMAP') return 950
  if (phase === 'REPLAY' && previousPhase === 'FOCUS') return 1350
  if (phase === 'FOCUS' && previousPhase === 'REPLAY') return 900
  if (phase === 'LIFEMAP' && previousPhase === 'FOCUS') return 900
  if (phase === 'HOME' && previousPhase === 'LIFEMAP') return 1500
  return 0
}

function toTransitionPhase(action: UraiCommand['type'] | 'idle'): TransitionPhase {
  switch (action) {
    case 'ENTER_ASCENT':
    case 'BEGIN_ASCENT':
      return 'ascent'
    case 'COMPLETE_ASCENT':
    case 'ARRIVE_LIFEMAP':
    case 'OPEN_LIFEMAP':
      return 'arrive_lifemap'
    case 'SELECT_STAR':
    case 'OPEN_FOCUS':
      return 'open_focus'
    case 'ENTER_REPLAY':
    case 'OPEN_REPLAY':
      return 'open_replay'
    case 'EXIT_REPLAY':
    case 'CLOSE_REPLAY':
      return 'close_replay'
    case 'EXIT_FOCUS':
    case 'CLOSE_FOCUS':
      return 'close_focus'
    case 'RETURN_HOME':
    case 'GO_HOME':
      return 'go_home'
    default:
      return 'idle'
  }
}

function normalizedAction(action: UraiCommand): UraiCommand {
  switch (action.type) {
    case 'GO_ASCENT':
    case 'BEGIN_ASCENT':
      return { type: 'ENTER_ASCENT' }
    case 'GO_LIFEMAP':
    case 'ARRIVE_LIFEMAP':
      return { type: 'COMPLETE_ASCENT' }
    case 'GO_FOCUS':
      return { type: 'SELECT_STAR', starId: action.starId }
    case 'GO_REPLAY':
      return { type: 'ENTER_REPLAY', starId: action.starId }
    case 'CLOSE_REPLAY':
      return { type: 'EXIT_REPLAY' }
    case 'CLOSE_FOCUS':
      return { type: 'EXIT_FOCUS' }
    case 'ESC':
      return { type: 'ESCAPE' }
    case 'TRANSITION_DONE':
    case 'END_TRANSITION':
      return { type: 'SET_TRANSITIONING', value: false }
    default:
      return action
  }
}

function stamp(
  state: UraiRuntimeState,
  nextPhase: UraiPhase,
  transitioning: boolean,
  phaseLabel: TransitionPhase,
  selectedStarId: string | null = state.selectedStarId,
  replayStarId: string | null = state.replayStarId,
  hoveredStarId: string | null = state.hoveredStarId
): UraiRuntimeState {
  return {
    ...state,
    phase: nextPhase,
    mode: phaseToMode(nextPhase),
    previousPhase: state.phase,
    selectedStarId,
    replayStarId,
    hoveredStarId,
    isTransitioning: transitioning,
    transitioning,
    inputLocked: transitioning,
    transitionLock: transitioning,
    phaseEnteredAt: nowMs(),
    transitionPhase: phaseLabel,
    transitionState: phaseLabel,
  }
}

export const INITIAL_TIER1_STATE: CanonState = {
  phase: 'HOME',
  mode: 'home',
  previousPhase: null,
  selectedStarId: null,
  replayStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
  transitioning: false,
  inputLocked: false,
  transitionLock: false,
  phaseEnteredAt: 0,
  transitionPhase: 'idle',
  transitionState: 'idle',
}

export const INITIAL_URAI_RUNTIME_STATE = INITIAL_TIER1_STATE
export const initialCanonState = INITIAL_TIER1_STATE
export const initialUraiState = INITIAL_TIER1_STATE

export function resolveEscTarget(
  input: UraiPhase | Tier1Mode | Pick<UraiRuntimeState, 'phase' | 'mode'>
): Tier1Mode | null {
  const phase: UraiPhase =
    typeof input === 'string'
      ? (
          input === 'home' || input === 'ascent' || input === 'lifemap' || input === 'focus' || input === 'replay'
            ? modeToPhase(input)
            : input
        )
      : (input.phase ?? modeToPhase(input.mode))

  if (phase === 'REPLAY') return 'focus'
  if (phase === 'FOCUS') return 'lifemap'
  if (phase === 'LIFEMAP') return 'home'
  return null
}

export function reduceRuntimeState(
  state: CanonState = INITIAL_TIER1_STATE,
  incoming: UraiCommand
): CanonState {
  const action = normalizedAction(incoming)

  switch (action.type) {
    case 'ENTER_ASCENT':
      if (state.phase !== 'HOME') return state
      return stamp(state, 'ASCENT', true, toTransitionPhase(action.type), null, null)

    case 'COMPLETE_ASCENT':
    case 'OPEN_LIFEMAP':
      if (state.phase !== 'ASCENT' && state.phase !== 'FOCUS') return state
      return stamp(state, 'LIFEMAP', false, 'idle', state.selectedStarId, null)

    case 'SELECT_STAR':
    case 'OPEN_FOCUS':
      if (state.phase !== 'LIFEMAP') return state
      return stamp(state, 'FOCUS', true, toTransitionPhase(action.type), action.starId, null)

    case 'ENTER_REPLAY':
    case 'OPEN_REPLAY':
      if (state.phase !== 'FOCUS') return state
      return stamp(
        state,
        'REPLAY',
        true,
        toTransitionPhase(action.type),
        state.selectedStarId,
        action.starId ?? state.selectedStarId
      )

    case 'EXIT_REPLAY':
      if (state.phase !== 'REPLAY') return state
      return stamp(state, 'FOCUS', true, 'close_replay', state.selectedStarId, null)

    case 'EXIT_FOCUS':
      if (state.phase !== 'FOCUS') return state
      return stamp(state, 'LIFEMAP', true, 'close_focus', state.selectedStarId, null)

    case 'RETURN_HOME':
    case 'GO_HOME':
      if (state.phase !== 'LIFEMAP') return state
      return stamp(state, 'HOME', true, 'go_home', null, null)

    case 'SET_TRANSITIONING':
      return {
        ...state,
        isTransitioning: action.value,
        transitioning: action.value,
        inputLocked: action.value,
        transitionLock: action.value,
        transitionPhase: action.value ? state.transitionPhase : 'idle',
        transitionState: action.value ? state.transitionState : 'idle',
      }

    case 'SET_HOVERED_STAR':
      return {
        ...state,
        hoveredStarId: action.starId,
      }

    case 'ESCAPE':
      if (state.phase === 'REPLAY') {
        return stamp(state, 'FOCUS', true, 'close_replay', state.selectedStarId, null)
      }
      if (state.phase === 'FOCUS') {
        return stamp(state, 'LIFEMAP', true, 'close_focus', state.selectedStarId, null)
      }
      if (state.phase === 'LIFEMAP') {
        return stamp(state, 'HOME', true, 'go_home', null, null)
      }
      return state

    default:
      return state
  }
}

export const tier1Reducer = reduceRuntimeState
export const uraiReducer = reduceRuntimeState

export function makeStarNode(
  id: string,
  position: Vec3,
  intensity = 1,
  kind: StarNode['kind'] = 'memory'
): StarNode {
  return {
    id,
    position,
    x: position[0],
    y: position[1],
    z: position[2],
    intensity,
    kind,
  }
}
