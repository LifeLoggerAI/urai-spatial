import type { CompanionExpression } from "./CompanionEmotionEngine";
import type { CompanionContext, CompanionMemorySignal, CompanionState } from "./companionTypes";

export type CompanionContinuityCue = {
  id: string;
  context: CompanionContext;
  textPrefix: string;
  anticipationPauseMs: number;
  echoStrength: number;
  recallReason: string;
  shouldUse: boolean;
};

export type CompanionContinuityInput = {
  context: CompanionContext;
  state: CompanionState;
  memorySignals?: CompanionMemorySignal[];
  expression?: CompanionExpression;
  now?: Date;
};

function strongestSignal(signals: CompanionMemorySignal[] = []) {
  return [...signals].sort((a, b) => b.intensity - a.intensity)[0] ?? null;
}

function recentTheme(state: CompanionState, context: CompanionContext) {
  return state.recentThemes.find((theme) => theme !== context) ?? null;
}

export function buildCompanionContinuityCue(input: CompanionContinuityInput): CompanionContinuityCue {
  const signal = strongestSignal(input.memorySignals);
  const theme = recentTheme(input.state, input.context);
  const familiarity = input.state.familiarityLevel ?? 0.35;
  const trust = input.state.trustLevel ?? 0.45;
  const restraint = input.expression?.restraint ?? 0.7;
  const canRecall = familiarity > 0.42 && trust > 0.38 && input.context !== "threshold";

  if (signal && canRecall) {
    return {
      id: `recall-${signal.id}`,
      context: input.context,
      textPrefix: `This connects to ${signal.summary}.`,
      anticipationPauseMs: Math.round(420 + restraint * 520),
      echoStrength: Math.min(1, signal.intensity * 0.72 + familiarity * 0.18),
      recallReason: signal.source,
      shouldUse: true,
    };
  }

  if (theme && canRecall) {
    return {
      id: `theme-${theme}`,
      context: input.context,
      textPrefix: `I remember this shape from ${theme}.`,
      anticipationPauseMs: Math.round(360 + restraint * 480),
      echoStrength: Math.min(1, familiarity * 0.55 + trust * 0.25),
      recallReason: "recent_theme",
      shouldUse: input.context === "mirror" || input.context === "lifemap" || input.context === "focus",
    };
  }

  return {
    id: `quiet-${input.context}`,
    context: input.context,
    textPrefix: "",
    anticipationPauseMs: Math.round(260 + restraint * 360),
    echoStrength: 0,
    recallReason: "quiet_presence",
    shouldUse: false,
  };
}

export function applyContinuityToLine(line: string, cue: CompanionContinuityCue) {
  if (!cue.shouldUse || !cue.textPrefix) return line;
  if (line.includes(cue.textPrefix)) return line;
  return `${cue.textPrefix} ${line}`;
}

export function updateContinuityMemory(state: CompanionState, cue: CompanionContinuityCue): CompanionState {
  if (!cue.shouldUse) return state;
  return {
    ...state,
    recentThemes: Array.from(new Set([cue.context, cue.recallReason, ...state.recentThemes])).slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

export function consciousFeelingDisclosure() {
  return "URAI is not conscious; it creates continuity by remembering patterns, timing responses, and adapting tone.";
}
