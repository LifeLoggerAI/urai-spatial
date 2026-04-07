export type Vec3 = [number, number, number]

export type UraiPhase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
export type AuthorityPhase = UraiPhase
export type LowerPhase = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'
export type Tier1Mode = LowerPhase
export type CanonMode = Tier1Mode
export type AuthorityMode = Tier1Mode

export type TransitionPhase =
  | 'idle'
  | 'ascent'
  | 'arrive_lifemap'
  | 'open_focus'
  | 'open_replay'
  | 'close_replay'
  | 'close_focus'
  | 'go_home'

export type TransitionState = TransitionPhase

export interface StarNode {
  id: string
  position?: Vec3
  x?: number
  y?: number
  z?: number
  intensity: number
  kind?: 'background' | 'memory' | 'anchor'
}

export interface CameraPose {
  position: Vec3
  target: Vec3
  fov?: number
}

export interface CameraConvergenceSpec {
  durationMs: number
  damping?: number
}

export interface PerformanceBudget {
  maxStars?: number
  maxParticles?: number
  lodBias?: number
}

export interface TransitionSpec {
  from: UraiPhase
  to: UraiPhase
  durationMs: number
  damping?: number
}

export interface UraiRuntimeState {
  phase: UraiPhase
  mode: Tier1Mode
  previousPhase: UraiPhase | null
  selectedStarId: string | null
  replayStarId: string | null
  hoveredStarId: string | null
  isTransitioning: boolean
  transitioning: boolean
  inputLocked: boolean
  transitionLock: boolean
  phaseEnteredAt: number
  transitionPhase: TransitionPhase
  transitionState: TransitionState
}

export type UraiState = UraiRuntimeState
export type CanonState = UraiRuntimeState

export type UraiCommand =
  | { type: 'ENTER_ASCENT' }
  | { type: 'COMPLETE_ASCENT' }
  | { type: 'SELECT_STAR'; starId: string }
  | { type: 'ENTER_REPLAY'; starId?: string }
  | { type: 'EXIT_REPLAY' }
  | { type: 'EXIT_FOCUS' }
  | { type: 'RETURN_HOME' }
  | { type: 'SET_TRANSITIONING'; value: boolean }
  | { type: 'SET_HOVERED_STAR'; starId: string | null }
  | { type: 'OPEN_LIFEMAP' }
  | { type: 'OPEN_FOCUS'; starId: string }
  | { type: 'OPEN_REPLAY'; starId?: string }
  | { type: 'GO_HOME' }
  | { type: 'GO_ASCENT' }
  | { type: 'GO_LIFEMAP' }
  | { type: 'GO_FOCUS'; starId: string }
  | { type: 'GO_REPLAY'; starId?: string }
  | { type: 'ESCAPE' }
  | { type: 'ESC' }
  | { type: 'TRANSITION_DONE' }
  | { type: 'BEGIN_ASCENT' }
  | { type: 'ARRIVE_LIFEMAP' }
  | { type: 'END_TRANSITION' }
  | { type: 'CLOSE_REPLAY' }
  | { type: 'CLOSE_FOCUS' }

export type CanonAction = UraiCommand
export type CanonEscAction = { type: 'ESCAPE' } | { type: 'ESC' }
