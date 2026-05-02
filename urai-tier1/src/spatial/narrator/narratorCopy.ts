import type { EmotionalState, NarratorLine, NarratorMoment, NarratorTone } from "./narratorTypes";

type VoiceConfig = {
  voiceId: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speaking_rate: number;
};

export const URAI_VOICE_CONFIG: Record<NarratorTone, VoiceConfig> = {
  calm: {
    voiceId: process.env.NEXT_PUBLIC_URAI_ELEVENLABS_CALM_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    stability: 0.72,
    similarity_boost: 0.82,
    style: 0.16,
    speaking_rate: 0.88,
  },
  awe: {
    voiceId: process.env.NEXT_PUBLIC_URAI_ELEVENLABS_AWE_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    stability: 0.66,
    similarity_boost: 0.8,
    style: 0.32,
    speaking_rate: 0.84,
  },
  tension: {
    voiceId: process.env.NEXT_PUBLIC_URAI_ELEVENLABS_TENSION_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    stability: 0.48,
    similarity_boost: 0.76,
    style: 0.24,
    speaking_rate: 0.94,
  },
  grief: {
    voiceId: process.env.NEXT_PUBLIC_URAI_ELEVENLABS_GRIEF_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    stability: 0.76,
    similarity_boost: 0.84,
    style: 0.12,
    speaking_rate: 0.78,
  },
  recovery: {
    voiceId: process.env.NEXT_PUBLIC_URAI_ELEVENLABS_RECOVERY_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    stability: 0.68,
    similarity_boost: 0.8,
    style: 0.22,
    speaking_rate: 0.9,
  },
  neutral: {
    voiceId: process.env.NEXT_PUBLIC_URAI_ELEVENLABS_DEFAULT_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.14,
    speaking_rate: 0.88,
  },
};

const SCRIPT_LIBRARY: Record<NarratorMoment, string[]> = {
  home_idle: [
    "The field is quiet.",
    "Nothing needs to move yet.",
    "The system is listening.",
    "Stay near the center.",
    "The origin is awake.",
  ],
  ascent_begin: [
    "The ground is letting go.",
    "Rise when the field opens.",
    "The map is above you.",
    "The first layer is lifting.",
    "Leave slowly. Stay aware.",
  ],
  lifemap_arrival: [
    "The memories are visible now.",
    "The constellation has formed.",
    "This is the wider pattern.",
    "The field is arranged.",
    "Look for what repeats.",
  ],
  memory_selected: [
    "This one answered.",
    "Something marked this point.",
    "This signal is active.",
    "The field chose this.",
    "This memory is awake.",
  ],
  focus_arrival: [
    "You are close enough now.",
    "This one carries shape.",
    "The signal is clearer here.",
    "Hold at this distance.",
    "The memory has weight.",
  ],
  replay_enter: [
    "The chamber is forming.",
    "Enter without forcing it.",
    "This place remembers.",
    "The moment is opening.",
    "Stay inside the signal.",
  ],
  replay_hold: [
    "Let the silence work.",
    "Do not rush this part.",
    "The weight is speaking.",
    "Stay until it settles.",
    "This is where it held.",
  ],
  replay_exit: [
    "Leave the chamber intact.",
    "The memory can close now.",
    "Step back with it.",
    "The field is releasing.",
    "Nothing has been lost.",
  ],
  return_home: [
    "Return to the origin.",
    "The field comes back.",
    "Let the map fade.",
    "Come back slowly.",
    "The center is waiting.",
  ],
};

const TIMING: Record<NarratorMoment, { delayMs: number; durationMs: number; priority: number; interruptible: boolean }> = {
  home_idle: { delayMs: 1400, durationMs: 3400, priority: 10, interruptible: true },
  ascent_begin: { delayMs: 420, durationMs: 3200, priority: 35, interruptible: true },
  lifemap_arrival: { delayMs: 1050, durationMs: 3600, priority: 45, interruptible: true },
  memory_selected: { delayMs: 260, durationMs: 2800, priority: 55, interruptible: true },
  focus_arrival: { delayMs: 1150, durationMs: 3400, priority: 65, interruptible: false },
  replay_enter: { delayMs: 1250, durationMs: 3800, priority: 90, interruptible: false },
  replay_hold: { delayMs: 3200, durationMs: 4200, priority: 70, interruptible: false },
  replay_exit: { delayMs: 180, durationMs: 2800, priority: 95, interruptible: true },
  return_home: { delayMs: 700, durationMs: 3000, priority: 40, interruptible: true },
};

const recentLines: string[] = [];
let rotationSalt = 0;

function pickLine(moment: NarratorMoment): string {
  const options = SCRIPT_LIBRARY[moment] || [];
  const available = options.filter((line) => !recentLines.includes(line));
  const pool = available.length > 0 ? available : options;

  rotationSalt = (rotationSalt + 3) % 97;
  const index = Math.abs((Date.now() + rotationSalt + moment.length) % pool.length);
  const picked = pool[index] || options[0] || "";

  recentLines.push(picked);
  while (recentLines.length > 8) recentLines.shift();

  return picked;
}

function normalizeTone(tone?: string): NarratorTone {
  if (tone === "charged" || tone === "shadow") return "tension";
  if (tone === "bright" || tone === "hope") return "recovery";
  if (tone === "threshold") return "awe";
  if (tone === "calm" || tone === "awe" || tone === "tension" || tone === "grief" || tone === "recovery" || tone === "neutral") return tone;
  return "calm";
}

export function buildNarratorLine(
  moment: NarratorMoment,
  emotionalState?: Partial<EmotionalState>,
  memoryTitle?: string | null
): NarratorLine {
  const tone = normalizeTone(emotionalState?.tone);
  const config = URAI_VOICE_CONFIG[tone];
  const timing = TIMING[moment];

  const base = pickLine(moment);
  const title =
    memoryTitle && ["memory_selected", "focus_arrival", "replay_enter"].includes(moment)
      ? ` ${memoryTitle}.`
      : "";

  return {
    id: `${moment}:${tone}:${base}:${memoryTitle || "none"}`,
    moment,
    text: `${base}${title}`,
    tone,
    priority: timing.priority,
    delayMs: timing.delayMs,
    durationMs: timing.durationMs,
    voiceId: config.voiceId,
    interruptible: timing.interruptible,
  };
}
