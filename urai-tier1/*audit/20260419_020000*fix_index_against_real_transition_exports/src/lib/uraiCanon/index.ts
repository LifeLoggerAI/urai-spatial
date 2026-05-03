/* URAI_CANON_COMPAT_INDEX_V3 */
export {
PHASES,
SCENE_PHASES,
LEGAL_TRANSITIONS,
PHASE_TO_MODE,
MODE_TO_PHASE,
canTransition,
assertLegalTransition,
resolveTransitionDuration,
} from "./types";

export type {
Mode,
Phase,
UraiPhase,
CanonMode,
CanonPhase,
ScenePhase,
NarratorPhase,
Vec3,
StarPoint,
CameraPose,
CameraConvergenceSpec,
TransitionSpec,
TransitionStateName,
UraiRuntimeState,
UraiState,
UraiCommand,
CanonAction,
} from "./types";

export {
INITIAL_CANON_STATE,
INITIAL_URAI_RUNTIME_STATE,
normalizeToMode,
normalizeToPhase,
normalizeToUraiPhase,
coerceUraiPhase,
phaseToMode,
modeToPhase,
resolveEscTarget,
normalizeRuntimeState,
normalizeCanonState,
createInitialRuntimeState,
} from "./state";

export {
PERFORMANCE_BUDGET,
CAMERA_POSES,
CAMERA_CONVERGENCE,
} from "./camera";

export {
TRANSITIONS,
getTransitionSpec,
} from "./transitions";

export {
isValidUraiPhase,
normalizeStatePhase,
assertStatePhase,
} from "./validators";

export {
normalizeToModeName,
isCanonicalMode,
assertMode,
isLegalPair,
} from "./authorityGuards";

export {
resolveTransitionPhaseName,
getNextPhase,
getEscPhase,
} from "./transitionAuthority";
