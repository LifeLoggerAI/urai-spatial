import { useMemo } from "react";
import type { UraiRuntimeState } from "../../lib/uraiCanon/types";

export interface CanonInputFlags {
  canClickSky: boolean;
  canSelectStar: boolean;
  canEnterReplay: boolean;
  canEsc: boolean;
}

export function useCanonInputLock(state: UraiRuntimeState): CanonInputFlags {
  return useMemo(
    () => ({
      canClickSky: state.phase === "HOME" && !state.inputLocked,
      canSelectStar: state.phase === "LIFEMAP" && !state.inputLocked,
      canEnterReplay: state.phase === "FOCUS" && !state.inputLocked && !!state.selectedStarId,
      canEsc: !state.inputLocked && state.phase !== "HOME",
    }),
    [state.phase, state.inputLocked, state.selectedStarId],
  );
}
