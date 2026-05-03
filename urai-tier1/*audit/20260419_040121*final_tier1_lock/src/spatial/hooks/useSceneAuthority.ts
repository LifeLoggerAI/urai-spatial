"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  INITIAL_URAI_RUNTIME_STATE,
  normalizeRuntimeState,
} from "@/lib/uraiCanon/state";
import type { UraiRuntimeState } from "@/lib/uraiCanon/types";

const ASCENT_MS = 1800;
const FOCUS_MS = 1100;
const REPLAY_MS = 1100;
const GO_HOME_MS = 1800;
const REPLAY_HOLD_MS = 2200;

function illegal(message: string): void {
  console.warn(`[URAI_CANON_BLOCKED] ${message}`);
}

export function useSceneAuthority() {
  const [state, setState] = useState<UraiRuntimeState>(INITIAL_URAI_RUNTIME_STATE);

  useEffect(() => {
    if (state.phase === "ASCENT") {
      const timer = window.setTimeout(() => {
        setState((prevRaw) => {
          const prev = normalizeRuntimeState(prevRaw);
          if (prev.phase !== "ASCENT") return prev;
          return {
            ...prev,
            mode: "LIFEMAP",
            phase: "LIFEMAP",
            transitionToken: prev.transitionToken + 1,
            enteredAt: Date.now(),
            isTransitioning: false,
            transitioning: false,
            transitionLock: false,
            inputLocked: false,
            transitionState: "idle",
          };
        });
      }, ASCENT_MS);

      return () => window.clearTimeout(timer);
    }

    if (state.transitionState === "open_focus" || state.transitionState === "close_focus") {
      const timer = window.setTimeout(() => {
        setState((prevRaw) => {
          const prev = normalizeRuntimeState(prevRaw);
          return {
            ...prev,
            isTransitioning: false,
            transitioning: false,
            transitionLock: false,
            inputLocked: false,
            transitionState: "idle",
          };
        });
      }, FOCUS_MS);
      return () => window.clearTimeout(timer);
    }

    if (
      state.transitionState === "open_replay" ||
      state.transitionState === "close_replay"
    ) {
      const timer = window.setTimeout(() => {
        setState((prevRaw) => {
          const prev = normalizeRuntimeState(prevRaw);
          return {
            ...prev,
            isTransitioning: false,
            transitioning: false,
            transitionLock: false,
            inputLocked: false,
            transitionState: "idle",
          };
        });
      }, REPLAY_MS);
      return () => window.clearTimeout(timer);
    }

    if (state.transitionState === "go_home") {
      const timer = window.setTimeout(() => {
        setState((prevRaw) => {
          const prev = normalizeRuntimeState(prevRaw);
          return {
            ...prev,
            isTransitioning: false,
            transitioning: false,
            transitionLock: false,
            inputLocked: false,
            transitionState: "idle",
          };
        });
      }, GO_HOME_MS);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [state.phase, state.transitionState]);

  const beginAscent = useCallback(() => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);
      if (prev.phase !== "HOME") {
        illegal(`beginAscent blocked outside HOME { phase: ${prev.phase} }`);
        return prev;
      }
      return {
        ...prev,
        mode: "ASCENT",
        phase: "ASCENT",
        transitionToken: prev.transitionToken + 1,
        enteredAt: Date.now(),
        isTransitioning: true,
        transitioning: true,
        transitionLock: true,
        inputLocked: true,
        transitionState: "open_lifemap",
      };
    });
  }, []);

  const openLifeMap = useCallback(() => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);
      if (prev.phase === "HOME") {
        return {
          ...prev,
          mode: "ASCENT",
          phase: "ASCENT",
          transitionToken: prev.transitionToken + 1,
          enteredAt: Date.now(),
          isTransitioning: true,
          transitioning: true,
          transitionLock: true,
          inputLocked: true,
          transitionState: "open_lifemap",
        };
      }
      if (prev.phase === "ASCENT" || prev.phase === "LIFEMAP") {
        return prev;
      }
      illegal(`openLifeMap blocked outside HOME/ASCENT/LIFEMAP { phase: ${prev.phase} }`);
      return prev;
    });
  }, []);

  const openFocus = useCallback((starId: string) => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);
      if (prev.phase !== "LIFEMAP") {
        illegal(`openFocus blocked outside LIFEMAP { phase: ${prev.phase} }`);
        return prev;
      }
      return {
        ...prev,
        mode: "FOCUS",
        phase: "FOCUS",
        selectedStarId: starId,
        transitionToken: prev.transitionToken + 1,
        enteredAt: Date.now(),
        isTransitioning: true,
        transitioning: true,
        transitionLock: true,
        inputLocked: true,
        transitionState: "open_focus",
      };
    });
  }, []);

  const openReplay = useCallback((starId?: string | null) => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);
      if (prev.phase !== "FOCUS") {
        illegal(`openReplay blocked outside FOCUS { phase: ${prev.phase} }`);
        return prev;
      }
      const resolvedStarId =
        typeof starId === "string" && starId.length > 0
          ? starId
          : prev.selectedStarId;
      if (!resolvedStarId) {
        illegal("openReplay blocked without selectedStarId");
        return prev;
      }
      return {
        ...prev,
        mode: "REPLAY",
        phase: "REPLAY",
        selectedStarId: resolvedStarId,
        transitionToken: prev.transitionToken + 1,
        enteredAt: Date.now(),
        dwellUntil: Date.now() + REPLAY_HOLD_MS,
        isTransitioning: true,
        transitioning: true,
        transitionLock: true,
        inputLocked: true,
        transitionState: "open_replay",
      };
    });
  }, []);

  const closeReplay = useCallback(() => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);
      if (prev.phase !== "REPLAY") {
        illegal(`closeReplay blocked outside REPLAY { phase: ${prev.phase} }`);
        return prev;
      }
      if (Date.now() < prev.dwellUntil) {
        return prev;
      }
      return {
        ...prev,
        mode: "FOCUS",
        phase: "FOCUS",
        transitionToken: prev.transitionToken + 1,
        enteredAt: Date.now(),
        isTransitioning: true,
        transitioning: true,
        transitionLock: true,
        inputLocked: true,
        transitionState: "close_replay",
      };
    });
  }, []);

  const goHome = useCallback(() => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);
      if (prev.phase !== "LIFEMAP") {
        illegal(`goHome blocked outside LIFEMAP { phase: ${prev.phase} }`);
        return prev;
      }
      return {
        ...prev,
        mode: "HOME",
        phase: "HOME",
        selectedStarId: null,
        transitionToken: prev.transitionToken + 1,
        enteredAt: Date.now(),
        isTransitioning: true,
        transitioning: true,
        transitionLock: true,
        inputLocked: true,
        transitionState: "go_home",
      };
    });
  }, []);

  const escape = useCallback(() => {
    setState((prevRaw) => {
      const prev = normalizeRuntimeState(prevRaw);

      if (prev.phase === "REPLAY") {
        if (Date.now() < prev.dwellUntil) {
          return prev;
        }
        return {
          ...prev,
          mode: "FOCUS",
          phase: "FOCUS",
          transitionToken: prev.transitionToken + 1,
          enteredAt: Date.now(),
          isTransitioning: true,
          transitioning: true,
          transitionLock: true,
          inputLocked: true,
          transitionState: "close_replay",
        };
      }

      if (prev.phase === "FOCUS") {
        return {
          ...prev,
          mode: "LIFEMAP",
          phase: "LIFEMAP",
          transitionToken: prev.transitionToken + 1,
          enteredAt: Date.now(),
          isTransitioning: true,
          transitioning: true,
          transitionLock: true,
          inputLocked: true,
          transitionState: "close_focus",
        };
      }

      if (prev.phase === "LIFEMAP") {
        return {
          ...prev,
          mode: "HOME",
          phase: "HOME",
          selectedStarId: null,
          transitionToken: prev.transitionToken + 1,
          enteredAt: Date.now(),
          isTransitioning: true,
          transitioning: true,
          transitionLock: true,
          inputLocked: true,
          transitionState: "go_home",
        };
      }

      return prev;
    });
  }, []);

  const api = useMemo(
    () => ({
      state,
      phase: state.phase,
      mode: state.mode,
      selectedStarId: state.selectedStarId,
      transitionToken: state.transitionToken,
      enteredAt: state.enteredAt,
      dwellUntil: state.dwellUntil,
      transitionState: state.transitionState,
      beginAscent,
      openLifeMap,
      openFocus,
      openReplay,
      closeReplay,
      goHome,
      escape,
      durations: {
        ascentMs: ASCENT_MS,
        focusMs: FOCUS_MS,
        replayMs: REPLAY_MS,
        goHomeMs: GO_HOME_MS,
        replayHoldMs: REPLAY_HOLD_MS,
      },
    }),
    [
      state,
      beginAscent,
      openLifeMap,
      openFocus,
      openReplay,
      closeReplay,
      goHome,
      escape,
    ],
  );

  return api;
}
