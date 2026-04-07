import { useEffect } from "react";
import type { UraiAction } from "../../lib/uraiCanon/state";
import type { UraiRuntimeState } from "../../lib/uraiCanon/types";

interface UseCanonEscArgs {
  state: UraiRuntimeState;
  dispatch: React.Dispatch<UraiAction>;
}

export function useCanonEsc({ state, dispatch }: UseCanonEscArgs): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape" || state.inputLocked) return;

      if (state.phase === "REPLAY") {
        dispatch({ type: "EXIT_REPLAY" });
        return;
      }

      if (state.phase === "FOCUS") {
        dispatch({ type: "EXIT_FOCUS" });
        return;
      }

      if (state.phase === "LIFEMAP") {
        dispatch({ type: "DESCEND_TO_HOME" });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.phase, state.inputLocked, dispatch]);
}
