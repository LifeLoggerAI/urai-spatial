export type TransitionPhase = "home" | "returning-home" | "lifemap";

type ChoreographyInput = {
  from: number;
  to: number;
  reducedMotion: boolean;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
};

export function createTransitionChoreographer(input: ChoreographyInput) {
  const clampedFrom = Math.min(1, Math.max(0, input.from));
  const clampedTo = Math.min(1, Math.max(0, input.to));
  if (input.reducedMotion) {
    input.onUpdate(clampedTo);
    input.onComplete?.();
    return () => undefined;
  }
  const start = performance.now();
  const duration = 680;
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    input.onUpdate(clampedFrom + (clampedTo - clampedFrom) * eased);
    if (t >= 1) {
      input.onComplete?.();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
