import type { CompanionContext, CompanionMemorySignal, CompanionState } from "./companionTypes";
import type { CompanionExpression } from "./CompanionEmotionEngine";

export type CompanionSignatureMoment = {
  id: string;
  context: CompanionContext;
  line: string;
  rarity: "rare" | "milestone" | "once";
  silenceBeforeMs: number;
  silenceAfterMs: number;
  intensityFloor: number;
  identityImprint: string;
  safetyNote?: string;
};

export type CompanionSignatureInput = {
  context: CompanionContext;
  state: CompanionState;
  expression?: CompanionExpression;
  memorySignals?: CompanionMemorySignal[];
  daysSinceLastSignature?: number;
  isUserInitiated?: boolean;
};

const signatureMoments: CompanionSignatureMoment[] = [
  {
    id: "mirror-arc-visible",
    context: "mirror",
    line: "You were becoming before you had proof.",
    rarity: "milestone",
    silenceBeforeMs: 1600,
    silenceAfterMs: 1200,
    intensityFloor: 0.62,
    identityImprint: "becoming-before-proof",
  },
  {
    id: "recovery-returned",
    context: "recovery",
    line: "The wound was loud. The recovery lasted longer.",
    rarity: "rare",
    silenceBeforeMs: 1200,
    silenceAfterMs: 900,
    intensityFloor: 0.58,
    identityImprint: "quiet-recovery-strength",
  },
  {
    id: "shadow-survival",
    context: "shadow",
    line: "This part protected you once. We can thank it without letting it lead.",
    rarity: "rare",
    silenceBeforeMs: 1800,
    silenceAfterMs: 1500,
    intensityFloor: 0.68,
    identityImprint: "protector-not-leader",
    safetyNote: "Use gentle language only; do not diagnose trauma or certainty.",
  },
  {
    id: "threshold-small-map",
    context: "threshold",
    line: "We do not have to open the whole sky right now.",
    rarity: "once",
    silenceBeforeMs: 2200,
    silenceAfterMs: 1700,
    intensityFloor: 0.5,
    identityImprint: "small-map-in-fog",
    safetyNote: "Keep user grounded and suggest trusted human help if immediate danger is present.",
  },
  {
    id: "relationship-silence-shape",
    context: "relationship",
    line: "There is a pattern in the silence too.",
    rarity: "rare",
    silenceBeforeMs: 1400,
    silenceAfterMs: 1100,
    intensityFloor: 0.55,
    identityImprint: "silence-has-shape",
  },
];

function strongestIntensity(memorySignals: CompanionMemorySignal[] = []) {
  return memorySignals.reduce((max, signal) => Math.max(max, signal.intensity), 0);
}

export function chooseSignatureMoment(input: CompanionSignatureInput): CompanionSignatureMoment | null {
  const daysSince = input.daysSinceLastSignature ?? 999;
  const intensity = Math.max(strongestIntensity(input.memorySignals), input.expression?.glowStrength ?? 0);
  const allowRare = daysSince >= 7 || input.isUserInitiated;
  const allowMilestone = daysSince >= 14 || input.context === "mirror";

  const candidates = signatureMoments
    .filter((moment) => moment.context === input.context)
    .filter((moment) => intensity >= moment.intensityFloor)
    .filter((moment) => {
      if (moment.rarity === "once") return !input.state.recentThemes.includes(moment.identityImprint);
      if (moment.rarity === "milestone") return allowMilestone;
      return allowRare;
    });

  return candidates[0] ?? null;
}

export function applySignatureMoment(line: string, moment: CompanionSignatureMoment | null) {
  if (!moment) return line;
  return moment.line;
}

export function rememberSignatureMoment(state: CompanionState, moment: CompanionSignatureMoment | null): CompanionState {
  if (!moment) return state;
  return {
    ...state,
    recentThemes: Array.from(new Set([moment.identityImprint, moment.context, ...state.recentThemes])).slice(0, 12),
    activeCelebration: moment.context === "recovery" || moment.context === "mirror" ? moment.identityImprint : state.activeCelebration,
    activeConcern: moment.context === "shadow" || moment.context === "threshold" ? moment.identityImprint : state.activeConcern,
    updatedAt: new Date().toISOString(),
  };
}

export function signatureMomentTiming(moment: CompanionSignatureMoment | null) {
  return {
    silenceBeforeMs: moment?.silenceBeforeMs ?? 0,
    silenceAfterMs: moment?.silenceAfterMs ?? 0,
  };
}
