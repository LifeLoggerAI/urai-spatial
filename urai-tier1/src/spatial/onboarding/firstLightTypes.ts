export type FirstLightStep =
  | "arrival"
  | "permission"
  | "companion"
  | "quiet_sky"
  | "first_star"
  | "arc_reveal"
  | "recovery_line"
  | "trust_contract"
  | "complete";

export type FirstLightVoiceMode = "silent" | "tapToHear" | "softVoice";

export type FirstLightChoice = "beginQuietly" | "previewLifeMap" | "connectSignals";

export type FirstLightProgress = {
  step: FirstLightStep;
  lineCount: number;
  voiceMode: FirstLightVoiceMode;
  completedAt?: string | null;
  trustedContract: boolean;
};

export type FirstLightScriptLine = {
  id: string;
  step: FirstLightStep;
  text: string;
  delayMs: number;
  silenceAfterMs: number;
  allowVoice: boolean;
};

export const MAX_COMPANION_LINES_FIRST_SESSION = 6;
