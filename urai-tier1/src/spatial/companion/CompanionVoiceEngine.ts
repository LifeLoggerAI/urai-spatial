import type { CompanionExpression } from "./CompanionEmotionEngine";
import type { CompanionContext, CompanionMood, CompanionState } from "./companionTypes";

export type CompanionVoiceMode = "off" | "tapToSpeak" | "softAuto";

export type CompanionVoiceProfile = {
  id: string;
  label: string;
  context: CompanionContext;
  mood: CompanionMood;
  rate: number;
  pitch: number;
  volume: number;
  pauseBeforeMs: number;
  maxCharacters: number;
  whisper: boolean;
};

export type CompanionSpeechPayload = {
  text: string;
  profile: CompanionVoiceProfile;
  canAutoPlay: boolean;
  reason: string;
};

const profiles: Record<CompanionContext, CompanionVoiceProfile> = {
  home: { id: "voice-home-quiet", label: "Quiet return", context: "home", mood: "quiet", rate: 0.88, pitch: 0.96, volume: 0.72, pauseBeforeMs: 700, maxCharacters: 90, whisper: true },
  lifemap: { id: "voice-lifemap-wonder", label: "Soft wonder", context: "lifemap", mood: "curious", rate: 0.92, pitch: 1.02, volume: 0.76, pauseBeforeMs: 520, maxCharacters: 110, whisper: false },
  focus: { id: "voice-focus-reflective", label: "Reflective close", context: "focus", mood: "reflective", rate: 0.86, pitch: 0.98, volume: 0.7, pauseBeforeMs: 900, maxCharacters: 95, whisper: true },
  replay: { id: "voice-replay-grounded", label: "Grounded narrator", context: "replay", mood: "grounding", rate: 0.82, pitch: 0.94, volume: 0.68, pauseBeforeMs: 1000, maxCharacters: 80, whisper: true },
  mirror: { id: "voice-mirror-warm", label: "Warm mirror", context: "mirror", mood: "reflective", rate: 0.88, pitch: 1.0, volume: 0.74, pauseBeforeMs: 850, maxCharacters: 110, whisper: false },
  recovery: { id: "voice-recovery-relief", label: "Relief", context: "recovery", mood: "celebratory", rate: 0.94, pitch: 1.04, volume: 0.78, pauseBeforeMs: 420, maxCharacters: 100, whisper: false },
  shadow: { id: "voice-shadow-protective", label: "Protective quiet", context: "shadow", mood: "protective", rate: 0.78, pitch: 0.92, volume: 0.58, pauseBeforeMs: 1200, maxCharacters: 70, whisper: true },
  dream: { id: "voice-dream-wonder", label: "Dream whisper", context: "dream", mood: "curious", rate: 0.84, pitch: 1.06, volume: 0.68, pauseBeforeMs: 900, maxCharacters: 95, whisper: true },
  relationship: { id: "voice-relationship-soft", label: "Soft concern", context: "relationship", mood: "concerned", rate: 0.82, pitch: 0.97, volume: 0.64, pauseBeforeMs: 1050, maxCharacters: 80, whisper: true },
  threshold: { id: "voice-threshold-small", label: "Small map", context: "threshold", mood: "grounding", rate: 0.74, pitch: 0.9, volume: 0.52, pauseBeforeMs: 1400, maxCharacters: 62, whisper: true },
};

function trimForVoice(text: string, maxCharacters: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxCharacters) return clean;
  return clean.slice(0, Math.max(0, maxCharacters - 3)).trimEnd() + "...";
}

export function companionVoiceProfileFor(context: CompanionContext, expression?: CompanionExpression): CompanionVoiceProfile {
  const base = profiles[context];
  if (!expression) return base;

  return {
    ...base,
    rate: Math.max(0.68, Math.min(1.05, base.rate - expression.restraint * 0.04)),
    pitch: Math.max(0.84, Math.min(1.12, base.pitch + (expression.warmth - 0.5) * 0.06)),
    volume: Math.max(0.42, Math.min(0.82, base.volume + expression.glowStrength * 0.04 - expression.restraint * 0.04)),
    whisper: base.whisper || expression.whisper,
  };
}

export function buildCompanionSpeechPayload(args: {
  text: string;
  context: CompanionContext;
  state?: CompanionState;
  expression?: CompanionExpression;
  mode?: CompanionVoiceMode;
  userGesture?: boolean;
}): CompanionSpeechPayload {
  const mode = args.mode ?? (args.state?.voiceEnabled ? "tapToSpeak" : "off");
  const profile = companionVoiceProfileFor(args.context, args.expression);
  const text = trimForVoice(args.text, profile.maxCharacters);
  const canAutoPlay = mode === "softAuto" && Boolean(args.state?.voiceEnabled) && !profile.whisper && (args.state?.silencePreference ?? 0.35) < 0.65;
  const canTapPlay = mode === "tapToSpeak" && Boolean(args.userGesture) && Boolean(args.state?.voiceEnabled);

  return {
    text,
    profile,
    canAutoPlay: canAutoPlay || canTapPlay,
    reason: canAutoPlay ? "soft_auto_allowed" : canTapPlay ? "tap_to_speak" : "voice_disabled_or_restrained",
  };
}

export function speakCompanionPayload(payload: CompanionSpeechPayload) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  if (!payload.canAutoPlay) return false;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(payload.text);
  utterance.rate = payload.profile.rate;
  utterance.pitch = payload.profile.pitch;
  utterance.volume = payload.profile.volume;

  window.setTimeout(() => window.speechSynthesis.speak(utterance), payload.profile.pauseBeforeMs);
  return true;
}
