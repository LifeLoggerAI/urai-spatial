"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildNarratorLine } from "./narratorCopy";
import { narratorPlayback } from "./narratorPlayback";
import type { EmotionalState, NarratorMoment } from "./narratorTypes";

type Phase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY" | string;

type Args = {
  phase: Phase;
  selectedMemoryTitle?: string | null;
  emotionalState?: Partial<EmotionalState>;
};

function momentForTransition(prev: Phase | null, next: Phase): NarratorMoment | null {
  if (!prev && next === "HOME") return "home_idle";
  if (prev === "HOME" && next === "ASCENT") return "ascent_begin";
  if (prev === "ASCENT" && next === "LIFEMAP") return "lifemap_arrival";
  if (prev === "LIFEMAP" && next === "FOCUS") return "focus_arrival";
  if (prev === "FOCUS" && next === "REPLAY") return "replay_enter";
  if (prev === "REPLAY" && next === "FOCUS") return "replay_exit";
  if ((prev === "FOCUS" || prev === "LIFEMAP") && next === "HOME") return "return_home";
  return null;
}

export function usePhaseNarrator({ phase, selectedMemoryTitle, emotionalState }: Args) {
  const prevPhaseRef = useRef<Phase | null>(null);
  const lastMemoryRef = useRef<string | null>(null);
  const replayHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stableEmotion = useMemo<Partial<EmotionalState>>(
    () => ({
      tone: emotionalState?.tone || "calm",
      symbolicWeight: emotionalState?.symbolicWeight || "medium",
      auraIntensity: emotionalState?.auraIntensity ?? 0.55,
    }),
    [emotionalState?.tone, emotionalState?.symbolicWeight, emotionalState?.auraIntensity]
  );

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === phase) return;

    if (replayHoldTimerRef.current) {
      clearTimeout(replayHoldTimerRef.current);
      replayHoldTimerRef.current = null;
    }

    
/* URAI_CINEMATIC_TIMING_V1 */
const settleDelay =
  phase === "ASCENT" ? 220 :
  phase === "LIFEMAP" ? 900 :
  phase === "FOCUS" ? 1100 :
  phase === "REPLAY" ? 1300 :
  phase === "HOME" ? 600 :
  400;

const moment = momentForTransition(prev, phase);
    
if (moment) {
  setTimeout(() => {
      console.info("[NARRATOR] phase trigger:", moment);
      narratorPlayback.playLine(buildNarratorLine(moment, stableEmotion, selectedMemoryTitle || null));
  }, settleDelay);
    }

    if (phase === "REPLAY") {
      replayHoldTimerRef.current = setTimeout(() => {
        if (prevPhaseRef.current === "REPLAY") {
          console.info("[NARRATOR] phase trigger: replay_hold");
          narratorPlayback.playLine(buildNarratorLine("replay_hold", stableEmotion, selectedMemoryTitle || null));
        }
      }, 4200);
    } else if (prev === "REPLAY") {
      narratorPlayback.stopLine("exit-replay");
    }

    prevPhaseRef.current = phase;

    return () => {
      if (replayHoldTimerRef.current) clearTimeout(replayHoldTimerRef.current);
    };
  }, [phase, selectedMemoryTitle, stableEmotion]);

  useEffect(() => {
    if (!selectedMemoryTitle) return;
    if (phase !== "LIFEMAP") return;
    if (lastMemoryRef.current === selectedMemoryTitle) return;

    lastMemoryRef.current = selectedMemoryTitle;
    console.info("[NARRATOR] phase trigger: memory_selected");
    narratorPlayback.playLine(buildNarratorLine("memory_selected", stableEmotion, selectedMemoryTitle));
  }, [phase, selectedMemoryTitle, stableEmotion]);

  useEffect(() => {
    return () => narratorPlayback.stopLine("unmount");
  }, []);
}
