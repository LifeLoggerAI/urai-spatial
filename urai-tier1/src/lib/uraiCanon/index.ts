export type {
  Vec3,
  UraiPhase,
  AuthorityPhase,
  LowerPhase,
  Tier1Mode,
  CanonMode,
  AuthorityMode,
  TransitionPhase,
  TransitionState,
  StarNode,
  CameraPose,
  CameraConvergenceSpec,
  PerformanceBudget,
  TransitionSpec,
  UraiRuntimeState,
  UraiState,
  CanonState,
  UraiCommand,
  CanonAction,
  CanonEscAction,
} from './types'

export {
  INITIAL_TIER1_STATE,
  INITIAL_URAI_RUNTIME_STATE,
  initialCanonState,
  initialUraiState,
  phaseToMode,
  modeToPhase,
  assertLegalTransition,
  isTransitioningState,
  getPhaseDurationMs,
  resolveEscTarget,
  reduceRuntimeState,
  tier1Reducer,
  uraiReducer,
  makeStarNode,
} from './state'

export {
  LEGAL_PHASE_TRANSITIONS,
  normalizeAuthorityPhase,
  assertAuthorityTransition,
  isFocusOrReplay,
  isReplayPhase,
  isHomeLike,
  resolveStableMode,
} from './authorityGuards'

export {
  resolvePose,
  resolveVeil,
  resolveAtmosphere,
  resolveCameraConvergence,
  resolveCameraDamping,
  resolveCameraDurationMs,
  resolveTransitionLockMs,
  transitionDurations,
  transitionLockWindows,
} from '@/spatial/canon/cameraCanon'

export {
  resolveEscPhaseTarget,
  resolveEscModeTarget,
  canEsc,
} from './escAuthority'

export {
  TRANSITION_MATRIX,
  TRANSITION_SPECS,
  getTransitionSpec,
  canTransition,
} from './transitions'

export {
  isUraiState,
  hasValidPhase,
  requiresSelectedStar,
} from './validators'

export {
  normalizePhaseLike,
  assertTransitionAuthority,
  resolveAuthorityTransition,
  resolveTransitionPhaseName,
} from './transitionAuthority'
