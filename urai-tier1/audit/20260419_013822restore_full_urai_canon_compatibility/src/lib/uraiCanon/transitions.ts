import type { Mode, TransitionSpec } from "./types";

export const TRANSITIONS: Record<string, TransitionSpec> = {
  HOME_ASCENT: { durationMs: 1800, damping: 0.12 },
  ASCENT_LIFEMAP: { durationMs: 900, damping: 0.14 },
  LIFEMAP_FOCUS: { durationMs: 850, damping: 0.16 },
  FOCUS_REPLAY: { durationMs: 1100, damping: 0.18 },
  REPLAY_FOCUS: { durationMs: 900, damping: 0.16 },
  FOCUS_LIFEMAP: { durationMs: 850, damping: 0.16 },
  LIFEMAP_HOME: { durationMs: 1000, damping: 0.14 },
};

export function getTransitionSpec(from: Mode, to: Mode): TransitionSpec | null {
  return TRANSITIONS["${from}_${to}"] ?? null;
}
