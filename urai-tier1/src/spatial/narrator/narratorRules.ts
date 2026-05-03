import type { Phase } from "@/lib/uraiCanon";
import type { EmotionalState, SpatialMemory } from "@/spatial/emotion/types";
import type { NarratorLine, NarratorMoment } from "./types";

function momentForPhase(phase: Phase, previousPhase?: Phase | null): NarratorMoment | null {
  if (phase === "HOME" && previousPhase === "LIFEMAP") return "return_home";
  if (phase === "HOME") return "home_idle";
  if (phase === "ASCENT") return "ascent_begin";
  if (phase === "LIFEMAP" && previousPhase === "ASCENT") return "lifemap_arrival";
  if (phase === "FOCUS") return "focus_arrival";
  if (phase === "REPLAY" && previousPhase === "FOCUS") return "replay_enter";
  if (phase === "REPLAY") return "replay_hold";
  return null;
}

function textFor(moment: NarratorMoment, memory: SpatialMemory | null, emotional: EmotionalState): string {
  const title = memory?.title ?? "this point";

  if (moment === "home_idle") return "The field is quiet.";
  if (moment === "ascent_begin") return "The system is leaving the surface.";
  if (moment === "lifemap_arrival") return "The map is open.";
  if (moment === "replay_hold") {
    if (emotional.symbolicWeight === "threshold") return "This is a threshold memory.";
    if (emotional.symbolicWeight === "heavy") return "This moment still has gravity.";
    return "The memory is holding steady.";
  }
  if (moment === "replay_exit") return "Leaving the memory field.";
  if (moment === "return_home") return "The system has returned home.";
  return "The field is active.";
}

export function createNarratorLine(args: {
  phase: Phase;
  previousPhase?: Phase | null;
  memory: SpatialMemory | null;
  emotional: EmotionalState;
}): NarratorLine | null {
  const moment = momentForPhase(args.phase, args.previousPhase);
  if (!moment) return null;

  return {
    moment,
    text: textFor(moment, args.memory, args.emotional),
    tone: args.emotional.tone,
    priority: args.phase === "REPLAY" ? 3 : args.phase === "FOCUS" ? 2 : 1,
    delayMs: args.phase === "ASCENT" ? 500 : 150,
    durationMs: args.phase === "REPLAY" ? 4200 : 2800,
    voiceHint: args.emotional.tone,
  };
}
