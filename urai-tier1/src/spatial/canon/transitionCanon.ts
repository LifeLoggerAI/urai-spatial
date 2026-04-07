export type CanonPhase =
  | "home"
  | "ascent"
  | "lifemap"
  | "focus-enter"
  | "focus"
  | "replay-enter"
  | "replay"
  | "unwind-replay-focus"
  | "unwind-focus-lifemap"
  | "unwind-lifemap-home"

export type MotionEnvelope = {
  durationMs: number
  settleMs: number
  travel: "translate" | "translate_descend" | "translate_ascend" | "expand" | "contract"
  easing: [number, number, number, number]
}

export const CANON_ENVELOPES: Record<CanonPhase, MotionEnvelope> = {
  home: { durationMs: 0, settleMs: 0, travel: "translate", easing: [0.22, 1, 0.36, 1] },
  ascent: { durationMs: 2480, settleMs: 440, travel: "translate_ascend", easing: [0.14, 1, 0.26, 1] },
  lifemap: { durationMs: 0, settleMs: 0, travel: "translate", easing: [0.22, 1, 0.36, 1] },
  "focus-enter": { durationMs: 920, settleMs: 260, travel: "translate", easing: [0.18, 1, 0.28, 1] },
  focus: { durationMs: 0, settleMs: 0, travel: "translate", easing: [0.18, 1, 0.28, 1] },
  "replay-enter": { durationMs: 1920, settleMs: 420, travel: "translate_descend", easing: [0.12, 1, 0.24, 1] },
  replay: { durationMs: 0, settleMs: 0, travel: "translate", easing: [0.16, 1, 0.30, 1] },
  "unwind-replay-focus": { durationMs: 1080, settleMs: 220, travel: "translate", easing: [0.22, 1, 0.36, 1] },
  "unwind-focus-lifemap": { durationMs: 1120, settleMs: 220, travel: "expand", easing: [0.22, 1, 0.36, 1] },
  "unwind-lifemap-home": { durationMs: 1820, settleMs: 300, travel: "translate_descend", easing: [0.22, 1, 0.36, 1] },
}

export const TRANSITION_HOLDS = {
  focusAfterReplayMs: 360,
  lifemapAfterFocusMs: 320,
}

export function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export function cubicBezierEase(t: number): number {
  const x = clamp01(t)
  return 1 - Math.pow(1 - x, 3)
}
