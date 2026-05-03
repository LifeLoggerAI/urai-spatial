"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UraiPhase } from "@/lib/uraiCanon/types";

const ASCENT_TO_LIFEMAP_MS = 1700;
const REPLAY_TO_FOCUS_MS = 1200;
const FOCUS_TO_LIFEMAP_MS = 900;
const LIFEMAP_TO_HOME_MS = 900;

export type SceneAuthority = {
  phase: UraiPhase;
  selectedStarId: string | null;
  transitionStartMs: number | null;
  beginAscent: () => void;
  openLifeMap: () => void;
  openFocus: (starId: string) => void;
  openReplay: (starId?: string | null) => void;
  closeReplay: () => void;
  goHome: () => void;
};

export function useSceneAuthority(): SceneAuthority {
  const [phase, setPhase] = useState<UraiPhase>("HOME");
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [transitionStartMs, setTransitionStartMs] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const markTransition = useCallback(() => {
    setTransitionStartMs(performance.now());
  }, []);

  const beginAscent = useCallback(() => {
    if (phase !== "HOME") {
      console.error("[SPATIAL][FLOW] beginAscent blocked outside HOME", { phase });
      return;
    }
    clearTimer();
    markTransition();
    setPhase("ASCENT");
    timerRef.current = window.setTimeout(() => {
      setPhase("LIFEMAP");
      setTransitionStartMs(performance.now());
      timerRef.current = null;
    }, ASCENT_TO_LIFEMAP_MS);
  }, [clearTimer, markTransition, phase]);

  const openLifeMap = useCallback(() => {
    if (phase === "HOME") {
      beginAscent();
      return;
    }
    if (phase === "LIFEMAP") return;
    if (phase !== "ASCENT" && phase !== "FOCUS") {
      console.error("[SPATIAL][FLOW] openLifeMap blocked outside HOME/ASCENT/FOCUS/LIFEMAP", { phase });
      return;
    }
    clearTimer();
    markTransition();
    setPhase("LIFEMAP");
  }, [beginAscent, clearTimer, markTransition, phase]);

  const openFocus = useCallback((starId: string) => {
    if (phase !== "LIFEMAP") {
      console.error("[SPATIAL][FLOW] openFocus blocked outside LIFEMAP", { phase, starId, selectedStarId });
      return;
    }
    if (!starId) {
      console.error("[SPATIAL][FLOW] openFocus missing starId", { phase });
      return;
    }
    clearTimer();
    setSelectedStarId(starId);
    markTransition();
    setPhase("FOCUS");
  }, [clearTimer, markTransition, phase, selectedStarId]);

  const openReplay = useCallback((starId?: string | null) => {
    if (phase !== "ASCENT" && phase !== "FOCUS") {
      console.error("[SPATIAL][FLOW] openReplay blocked outside FOCUS", { phase, starId, selectedStarId });
      return;
    }
    const nextStarId = starId ?? selectedStarId;
    if (!nextStarId) {
      console.error("[SPATIAL][FLOW] openReplay missing selected star", { phase, starId, selectedStarId });
      return;
    }
    clearTimer();
    setSelectedStarId(nextStarId);
    markTransition();
    setPhase("REPLAY");
  }, [clearTimer, markTransition, phase, selectedStarId]);

  const closeReplay = useCallback(() => {
    if (phase !== "REPLAY") {
      console.error("[SPATIAL][FLOW] closeReplay blocked outside REPLAY", { phase, selectedStarId });
      return;
    }
    clearTimer();
    markTransition();
    setPhase("FOCUS");
    timerRef.current = window.setTimeout(() => {
      setTransitionStartMs(performance.now());
      timerRef.current = null;
    }, REPLAY_TO_FOCUS_MS);
  }, [clearTimer, markTransition, phase, selectedStarId]);

  const goHome = useCallback(() => {
    clearTimer();

    if (phase === "REPLAY") {
      markTransition();
      setPhase("FOCUS");
      timerRef.current = window.setTimeout(() => {
        setTransitionStartMs(performance.now());
        setPhase("LIFEMAP");
        timerRef.current = window.setTimeout(() => {
          setTransitionStartMs(performance.now());
          setPhase("HOME");
          setSelectedStarId(null);
          timerRef.current = null;
        }, LIFEMAP_TO_HOME_MS);
      }, REPLAY_TO_FOCUS_MS + FOCUS_TO_LIFEMAP_MS);
      return;
    }

    if (phase === "FOCUS") {
      markTransition();
      setPhase("LIFEMAP");
      timerRef.current = window.setTimeout(() => {
        setTransitionStartMs(performance.now());
        setPhase("HOME");
        setSelectedStarId(null);
        timerRef.current = null;
      }, FOCUS_TO_LIFEMAP_MS + LIFEMAP_TO_HOME_MS);
      return;
    }

    if (phase === "LIFEMAP") {
      markTransition();
      setPhase("HOME");
      setSelectedStarId(null);
      return;
    }

    if (phase === "ASCENT") {
      markTransition();
      setPhase("HOME");
      setSelectedStarId(null);
      return;
    }
  }, [clearTimer, markTransition, phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      clearTimer();

      if (phase === "REPLAY") {
        markTransition();
        setPhase("FOCUS");
        return;
      }

      if (phase === "FOCUS") {
        markTransition();
        timerRef.current = window.setTimeout(() => {
          setPhase("LIFEMAP");
          setTransitionStartMs(performance.now());
          timerRef.current = null;
        }, FOCUS_TO_LIFEMAP_MS);
        return;
      }

      if (phase === "LIFEMAP") {
        markTransition();
        timerRef.current = window.setTimeout(() => {
          setPhase("HOME");
          setSelectedStarId(null);
          setTransitionStartMs(performance.now());
          timerRef.current = null;
        }, LIFEMAP_TO_HOME_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearTimer, markTransition, phase]);

  return {
    phase,
    selectedStarId,
    transitionStartMs,
    beginAscent,
    openLifeMap,
    openFocus,
    openReplay,
    closeReplay,
    goHome,
  };
}

export default useSceneAuthority;
