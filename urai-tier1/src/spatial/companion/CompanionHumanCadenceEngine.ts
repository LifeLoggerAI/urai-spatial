import type { CompanionExpression } from "./CompanionEmotionEngine";
import type { CompanionContext, CompanionState } from "./companionTypes";
import type { CompanionSpeechPayload } from "./CompanionVoiceEngine";

export type CompanionCadenceMark = {
  text: string;
  pauseAfterMs: number;
  breathBefore: boolean;
  soften: boolean;
};

export type CompanionCadencePlan = {
  segments: CompanionCadenceMark[];
  totalPauseMs: number;
  delivery: "whisper" | "steady" | "warm" | "grounded";
};

const pauseByContext: Record<CompanionContext, number> = {
  home: 420,
  lifemap: 320,
  focus: 560,
  replay: 680,
  mirror: 520,
  recovery: 280,
  shadow: 760,
  dream: 620,
  relationship: 700,
  threshold: 920,
};

function splitHumanPhrases(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function deliveryFor(context: CompanionContext, expression?: CompanionExpression): CompanionCadencePlan["delivery"] {
  if (context === "shadow" || context === "dream") return "whisper";
  if (context === "threshold" || context === "replay") return "grounded";
  if (context === "recovery" || context === "mirror") return "warm";
  return expression?.whisper ? "whisper" : "steady";
}

export function buildCompanionCadencePlan(args: {
  text: string;
  context: CompanionContext;
  expression?: CompanionExpression;
  state?: CompanionState;
}): CompanionCadencePlan {
  const basePause = pauseByContext[args.context];
  const restraint = args.expression?.restraint ?? 0.7;
  const silence = args.state?.silencePreference ?? 0.35;
  const parts = splitHumanPhrases(args.text);
  const delivery = deliveryFor(args.context, args.expression);

  const segments = parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const pauseAfterMs = isLast ? 0 : Math.round(basePause * (0.82 + restraint * 0.28 + silence * 0.18));

    return {
      text: part,
      pauseAfterMs,
      breathBefore: index === 0 && (delivery === "whisper" || delivery === "grounded"),
      soften: delivery === "whisper" || args.context === "relationship" || args.context === "shadow",
    };
  });

  return {
    segments,
    totalPauseMs: segments.reduce((sum, segment) => sum + segment.pauseAfterMs, 0),
    delivery,
  };
}

export function humanizeCompanionText(text: string, context: CompanionContext) {
  const clean = text.trim();
  if (context === "shadow" || context === "threshold") {
    return clean.endsWith("...") ? clean : clean.replace(/[.!?]$/, "") + "...";
  }

  if (context === "recovery" && clean.length < 60 && !clean.endsWith(".")) {
    return clean + ".";
  }

  return clean;
}

export function speakCompanionCadence(payload: CompanionSpeechPayload, plan: CompanionCadencePlan) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  if (!payload.canAutoPlay) return false;

  window.speechSynthesis.cancel();

  let offset = payload.profile.pauseBeforeMs;

  for (const segment of plan.segments) {
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.rate = segment.soften ? Math.max(0.68, payload.profile.rate - 0.04) : payload.profile.rate;
    utterance.pitch = segment.soften ? Math.max(0.82, payload.profile.pitch - 0.02) : payload.profile.pitch;
    utterance.volume = segment.soften ? Math.max(0.38, payload.profile.volume - 0.06) : payload.profile.volume;

    window.setTimeout(() => window.speechSynthesis.speak(utterance), offset + (segment.breathBefore ? 260 : 0));
    offset += segment.pauseAfterMs + Math.max(450, Math.round(segment.text.length * 42));
  }

  return true;
}
