import { companionLines } from "./companionLines";
import type {
  CompanionContext,
  CompanionDecision,
  CompanionFeedback,
  CompanionLine,
  CompanionMood,
  CompanionSceneInput,
  CompanionState,
} from "./companionTypes";

const DEFAULT_STATE: CompanionState = {
  currentMood: "quiet",
  currentContext: "home",
  lastSpokenAt: null,
  lastLineId: null,
  trustLevel: 0.45,
  familiarityLevel: 0.35,
  silencePreference: 0.35,
  recentThemes: [],
  activeConcern: null,
  activeCelebration: null,
  voiceEnabled: false,
};

function minutesSince(value: string | null | undefined, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - time) / 60000);
}

export function companionContextFor(input: CompanionSceneInput): CompanionContext {
  if (input.showReplay || input.phase === "replay") return "replay";
  if (input.phase === "mirror" || input.mode === "mirror") return "mirror";
  if (input.selectedNode?.isShadow || input.mode === "shadow") return "shadow";
  if (input.selectedNode?.nodeType === "threshold") return "threshold";
  if (input.selectedNode?.isRecovery || input.mode === "recovery") return "recovery";
  if (input.selectedNode?.isDream || input.mode === "dream") return "dream";
  if (input.selectedNode?.isRelationship || input.mode === "relationship") return "relationship";
  if (input.phase === "focus" && input.selectedNode) return "focus";
  if (input.phase === "lifemap" || input.phase === "ascent") return "lifemap";
  return "home";
}

export function companionMoodFor(context: CompanionContext): CompanionMood {
  if (context === "shadow") return "protective";
  if (context === "threshold") return "grounding";
  if (context === "recovery") return "celebratory";
  if (context === "mirror" || context === "focus") return "reflective";
  if (context === "lifemap" || context === "dream" || context === "relationship") return "curious";
  return "quiet";
}

function fallbackLine(context: CompanionContext, mood: CompanionMood): CompanionLine {
  return {
    id: `fallback-${context}`,
    context,
    mood,
    text: context === "shadow" ? "We can look gently." : context === "threshold" ? "Stay close to simple things." : "I’m here with you.",
    triggerReason: `context:${context}`,
    priority: 0,
    cooldownMinutes: 5,
  };
}

export function chooseCompanionLine(
  context: CompanionContext,
  mood: CompanionMood,
  state: CompanionState = DEFAULT_STATE,
): CompanionLine {
  const candidates = companionLines
    .filter((line) => line.context === context)
    .sort((a, b) => b.priority - a.priority);

  return candidates.find((line) => line.id !== state.lastLineId) ?? candidates[0] ?? fallbackLine(context, mood);
}

export function decideCompanionPresence(
  input: CompanionSceneInput,
  state: CompanionState = DEFAULT_STATE,
): CompanionDecision {
  const now = input.now ?? new Date();
  const context = companionContextFor(input);
  const mood = companionMoodFor(context);
  const line = chooseCompanionLine(context, mood, state);
  const elapsed = minutesSince(state.lastSpokenAt, now);
  const minimumCooldown = Math.max(line.cooldownMinutes, input.tapped ? 0 : 1.5);
  const shouldSpeak = Boolean(input.tapped || elapsed >= minimumCooldown);

  return {
    line,
    context,
    mood,
    shouldSpeak,
    reason: shouldSpeak ? line.triggerReason : "cooldown",
  };
}

export function applyCompanionDecision(
  state: CompanionState = DEFAULT_STATE,
  decision: CompanionDecision,
  now = new Date(),
): CompanionState {
  if (!decision.shouldSpeak) return state;

  return {
    ...state,
    currentMood: decision.mood,
    currentContext: decision.context,
    lastLineId: decision.line.id,
    lastSpokenAt: now.toISOString(),
    updatedAt: now.toISOString(),
    recentThemes: Array.from(new Set([decision.context, ...state.recentThemes])).slice(0, 8),
  };
}

export function applyCompanionFeedback(
  state: CompanionState = DEFAULT_STATE,
  feedback: CompanionFeedback,
): CompanionState {
  if (feedback === "not_now") {
    return { ...state, silencePreference: Math.min(1, state.silencePreference + 0.12), updatedAt: new Date().toISOString() };
  }

  if (feedback === "tell_more") {
    return { ...state, familiarityLevel: Math.min(1, state.familiarityLevel + 0.08), silencePreference: Math.max(0, state.silencePreference - 0.05), updatedAt: new Date().toISOString() };
  }

  return { ...state, trustLevel: Math.min(1, state.trustLevel + 0.08), updatedAt: new Date().toISOString() };
}

export { DEFAULT_STATE as defaultCompanionState };
