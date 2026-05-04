export type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

export type AscentSubstate = 'IDLE' | 'CAMERA_LIFT' | 'GROUND_RECESS' | 'STREAK_RAMP' | 'NEBULA_REVEAL' | 'COMPLETE'

export type SceneState = {
  phase: Phase
  selectedStarId: string | null
  inputLocked: boolean
}

export type SceneAction =
  | { type: 'START_ASCENT' }
  | { type: 'COMPLETE_ASCENT' }
  | { type: 'OPEN_FOCUS'; starId: string }
  | { type: 'OPEN_REPLAY' }
  | { type: 'ESC' }

export type AscentChannels = {
  cameraLift: number
  groundRecession: number
  starStreak: number
  nebulaReveal: number
  substate: AscentSubstate
}

export function validateTransition(state: SceneState, action: SceneAction): boolean {
  switch (action.type) {
    case 'START_ASCENT':
      return state.phase === 'HOME' && !state.inputLocked
    case 'COMPLETE_ASCENT':
      return state.phase === 'ASCENT'
    case 'OPEN_FOCUS':
      return state.phase === 'LIFEMAP' && !!action.starId && !state.inputLocked
    case 'OPEN_REPLAY':
      return state.phase === 'FOCUS' && !!state.selectedStarId && !state.inputLocked
    case 'ESC':
      return state.phase === 'REPLAY' || state.phase === 'FOCUS' || state.phase === 'LIFEMAP' || state.phase === 'ASCENT'
    default:
      return false
  }
}

export function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  if (!validateTransition(state, action)) return state

  switch (action.type) {
    case 'START_ASCENT':
      return { ...state, phase: 'ASCENT', inputLocked: true }
    case 'COMPLETE_ASCENT':
      return { ...state, phase: 'LIFEMAP', inputLocked: false }
    case 'OPEN_FOCUS':
      return { ...state, phase: 'FOCUS', selectedStarId: action.starId, inputLocked: false }
    case 'OPEN_REPLAY':
      return { ...state, phase: 'REPLAY', inputLocked: true }
    case 'ESC':
      if (state.phase === 'REPLAY') return { ...state, phase: 'FOCUS', inputLocked: false }
      if (state.phase === 'FOCUS') return { ...state, phase: 'LIFEMAP', selectedStarId: state.selectedStarId, inputLocked: false }
      return { phase: 'HOME', selectedStarId: null, inputLocked: false }
    default:
      return state
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const ASCENT_SPLITS = {
  cameraLiftEnd: 0.35,
  groundEnd: 0.65,
  streakEnd: 0.85,
  nebulaEnd: 1,
}

export function getAscentChannels(progress: number): AscentChannels {
  const p = clamp01(progress)
  const cameraLift = easeInOutCubic(clamp01(p / ASCENT_SPLITS.cameraLiftEnd))
  const groundRecession = easeInOutCubic(clamp01((p - 0.2) / (ASCENT_SPLITS.groundEnd - 0.2)))
  const starStreak = easeInOutCubic(clamp01((p - 0.45) / (ASCENT_SPLITS.streakEnd - 0.45)))
  const nebulaReveal = easeInOutCubic(clamp01((p - 0.72) / (ASCENT_SPLITS.nebulaEnd - 0.72)))

  let substate: AscentSubstate = 'CAMERA_LIFT'
  if (p === 0) substate = 'IDLE'
  else if (p >= ASCENT_SPLITS.nebulaEnd) substate = 'COMPLETE'
  else if (p >= 0.72) substate = 'NEBULA_REVEAL'
  else if (p >= 0.45) substate = 'STREAK_RAMP'
  else if (p >= 0.2) substate = 'GROUND_RECESS'

  return { cameraLift, groundRecession, starStreak, nebulaReveal, substate }
}
