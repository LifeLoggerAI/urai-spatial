/* URAI_CANON_COMPAT_INDEX_V3 */

export type * from "./types";

export {
  INITIAL_CANON_STATE,
  INITIAL_URAI_RUNTIME_STATE,
  normalizeRuntimeState,
  assertLegalTransition,
  resolveTransitionDuration,
} from "./state";

export {
  CAMERA_POSES,
  getCameraPose,
  lerpCameraPose,
} from "./camera";

export {
  CANON_TRANSITIONS,
  canTransition,
  getAllowedTransitions,
} from "./transitions";

export {
  validateCanonState,
  validateTransitionRequest,
} from "./validators";

export {
  normalizeToMode,
  normalizeToPhase,
  assertLegalModeTransition,
  phaseToMode,
  modeToPhase,
} from "./authorityGuards";

export {
  resolveTransitionPhaseName,
  getNextPhase,
  getEscPhase,
} from "./transitionAuthority";
