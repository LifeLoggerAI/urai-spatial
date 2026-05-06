import type { CompanionContext } from "./companionTypes";

export type LaunchPolishPreset = {
  context: CompanionContext;
  minLineGapMs: number;
  maxVisibleCharacters: number;
  orbTransitionMs: number;
  textFadeMs: number;
  postLineStillnessMs: number;
  allowSacredMoment: boolean;
};

export const companionLaunchPolish: Record<CompanionContext, LaunchPolishPreset> = {
  home: { context: "home", minLineGapMs: 90000, maxVisibleCharacters: 92, orbTransitionMs: 900, textFadeMs: 420, postLineStillnessMs: 1100, allowSacredMoment: false },
  lifemap: { context: "lifemap", minLineGapMs: 90000, maxVisibleCharacters: 110, orbTransitionMs: 760, textFadeMs: 360, postLineStillnessMs: 900, allowSacredMoment: false },
  focus: { context: "focus", minLineGapMs: 120000, maxVisibleCharacters: 96, orbTransitionMs: 820, textFadeMs: 420, postLineStillnessMs: 1200, allowSacredMoment: false },
  replay: { context: "replay", minLineGapMs: 150000, maxVisibleCharacters: 82, orbTransitionMs: 1000, textFadeMs: 520, postLineStillnessMs: 1500, allowSacredMoment: false },
  mirror: { context: "mirror", minLineGapMs: 180000, maxVisibleCharacters: 112, orbTransitionMs: 1100, textFadeMs: 560, postLineStillnessMs: 1700, allowSacredMoment: true },
  recovery: { context: "recovery", minLineGapMs: 180000, maxVisibleCharacters: 104, orbTransitionMs: 900, textFadeMs: 480, postLineStillnessMs: 1600, allowSacredMoment: true },
  shadow: { context: "shadow", minLineGapMs: 240000, maxVisibleCharacters: 72, orbTransitionMs: 1300, textFadeMs: 640, postLineStillnessMs: 2200, allowSacredMoment: false },
  dream: { context: "dream", minLineGapMs: 150000, maxVisibleCharacters: 92, orbTransitionMs: 1150, textFadeMs: 540, postLineStillnessMs: 1500, allowSacredMoment: false },
  relationship: { context: "relationship", minLineGapMs: 210000, maxVisibleCharacters: 84, orbTransitionMs: 1100, textFadeMs: 560, postLineStillnessMs: 1800, allowSacredMoment: false },
  threshold: { context: "threshold", minLineGapMs: 300000, maxVisibleCharacters: 64, orbTransitionMs: 1500, textFadeMs: 760, postLineStillnessMs: 2600, allowSacredMoment: false },
};

export function trimForLaunch(line: string, context: CompanionContext) {
  const preset = companionLaunchPolish[context];
  const clean = line.replace(/\s+/g, " ").trim();
  if (clean.length <= preset.maxVisibleCharacters) return clean;
  return clean.slice(0, Math.max(0, preset.maxVisibleCharacters - 3)).trimEnd() + "...";
}

export function shouldShowCompanionLine(args: {
  context: CompanionContext;
  lastShownAt?: string | null;
  now?: Date;
  userGesture?: boolean;
}) {
  if (args.userGesture) return true;
  if (!args.lastShownAt) return true;

  const last = new Date(args.lastShownAt).getTime();
  if (!Number.isFinite(last)) return true;

  const now = args.now ?? new Date();
  return now.getTime() - last >= companionLaunchPolish[args.context].minLineGapMs;
}

export const launchReadinessChecks = [
  "Restore SpatialScene.tsx from lifemap-complete-execution before wiring UI.",
  "Voice defaults to silent for first session.",
  "No sacred/signature moments during first session.",
  "No shadow, deception, or trauma copy in first five minutes.",
  "Companion line count is capped at six in First Light.",
  "Every companion line has a Why am I seeing this explanation available.",
  "All timers are cleared on unmount.",
  "No state updates happen every animation frame.",
];
