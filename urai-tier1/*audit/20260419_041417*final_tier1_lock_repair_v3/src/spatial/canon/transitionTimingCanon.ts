export type CompatLockWindowSpec = {
  durationMs: number;
  lockMs: number;
  releaseMs: number;
};

export const TRANSITION_TIMING_CANON: Record<string, CompatLockWindowSpec> = {
  HOME: { durationMs: 900, lockMs: 0, releaseMs: 0 },
  ASCENT: { durationMs: 1800, lockMs: 1800, releaseMs: 120 },
  LIFEMAP: { durationMs: 1200, lockMs: 900, releaseMs: 120 },
  FOCUS: { durationMs: 1000, lockMs: 900, releaseMs: 120 },
  REPLAY: { durationMs: 1400, lockMs: 1400, releaseMs: 180 },
  OPEN_REPLAY: { durationMs: 1100, lockMs: 1100, releaseMs: 160 },
  CLOSE_REPLAY: { durationMs: 900, lockMs: 900, releaseMs: 120 },
  DESCENT: { durationMs: 1200, lockMs: 1200, releaseMs: 120 },
  EXIT_FOCUS: { durationMs: 900, lockMs: 900, releaseMs: 120 },
  EXIT_REPLAY: { durationMs: 850, lockMs: 850, releaseMs: 120 },
  idle: { durationMs: 0, lockMs: 0, releaseMs: 0 },
};

export const TRANSITION_DURATIONS_MS: Record<string, number> = Object.fromEntries(
  Object.entries(TRANSITION_TIMING_CANON).map(([key, value]) => [key, value.durationMs])
);

export const TRANSITION_LOCK_WINDOWS: Record<string, CompatLockWindowSpec> = TRANSITION_TIMING_CANON;

export function getLockWindowSpec(phase: string): CompatLockWindowSpec {
  return TRANSITION_TIMING_CANON[phase] ?? {
    durationMs: 1000,
    lockMs: 0,
    releaseMs: 0,
  };
}

export function resolveTransitionDuration(phase: string): number {
  return getLockWindowSpec(phase).durationMs;
}

export function resolveTransitionLockWindow(phase: string): CompatLockWindowSpec {
  return getLockWindowSpec(phase);
}
