export const CANON_DURATIONS = {
  ascentMs: 1800,
  focusEnterMs: 900,
  replayEnterMs: 1100,
  unwindStepMs: 700,
} as const

export type CanonMode =
  | "HOME"
  | "ASCENT"
  | "LIFEMAP"
  | "focus-enter"
  | "FOCUS"
  | "replay-enter"
  | "REPLAY"
  | "unwind"

export function getModeFogColor(mode: CanonMode): string {
  switch (mode) {
    case "HOME":
      return "#02060b"
    case "ASCENT":
      return "#031144"
    case "LIFEMAP":
      return "#010814"
    case "focus-enter":
    case "FOCUS":
      return "#050d1b"
    case "replay-enter":
    case "REPLAY":
      return "#06101f"
    case "unwind":
      return "#04103a"
    default:
      return "#02060b"
  }
}

export function getPhaseDurationMs(mode: string): number {
  switch (mode) {
    case "ASCENT":
      return CANON_DURATIONS.ascentMs
    case "focus-enter":
      return CANON_DURATIONS.focusEnterMs
    case "replay-enter":
      return CANON_DURATIONS.replayEnterMs
    case "unwind":
      return CANON_DURATIONS.unwindStepMs
    default:
      return 0
  }
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
