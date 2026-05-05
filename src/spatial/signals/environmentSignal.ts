import { useMemo } from "react";
import { useSceneStore, type ScenePhase } from "../state/sceneStore";
import type { GroundMood, GroundPresence } from "../scene/GroundWorld";

export type SpatialMood = GroundMood;
export type SpatialPresence = GroundPresence;

export type EmotionSignal = {
  mood?: SpatialMood;
  intensity?: number;
  valence?: number;
  arousal?: number;
};

export type BehaviorSignal = {
  cognitiveLoad?: number;
  recovery?: number;
  rhythm?: number;
};

export type InteractionSignal = {
  presence?: SpatialPresence;
  hoverActive?: boolean;
  selectionActive?: boolean;
  inputLocked?: boolean;
};

export type EnvironmentSignalInput = {
  phase: ScenePhase;
  emotion?: EmotionSignal;
  behavior?: BehaviorSignal;
  interaction?: InteractionSignal;
};

export type SpatialPalette = {
  ground: string;
  sky: string;
  nebula: string;
  star: string;
  orbCore: string;
  orbHalo: string;
  accent: string;
};

export type EnvironmentSignal = {
  mood: SpatialMood;
  presence: SpatialPresence;
  emotionalIntensity: number;
  stability: number;
  aliveness: number;
  phase: ScenePhase;
  paletteRole: "home" | "transition" | "map" | "focus" | "replay";
  palette: SpatialPalette;
  motion: {
    breathRate: number;
    pulseRate: number;
    drift: number;
  };
  scene: {
    skyOpacity: number;
    groundOpacity: number;
    orbEnergy: number;
    starMix: number;
  };
};

const PHASE_PALETTE_ROLE: Record<ScenePhase, EnvironmentSignal["paletteRole"]> = {
  HOME: "home",
  ASCENT: "transition",
  LIFEMAP: "map",
  FOCUS: "focus",
  REPLAY: "replay",
};

const MOOD_PALETTES: Record<SpatialMood, SpatialPalette> = {
  calm: {
    ground: "#02040a",
    sky: "#02030a",
    nebula: "#2d3f74",
    star: "#dbeafe",
    orbCore: "#fffaf2",
    orbHalo: "#72d4ff",
    accent: "#73c5ff",
  },
  focused: {
    ground: "#030512",
    sky: "#020614",
    nebula: "#243b78",
    star: "#e0f2fe",
    orbCore: "#f8fbff",
    orbHalo: "#8cc8ff",
    accent: "#9fd2ff",
  },
  hopeful: {
    ground: "#04100e",
    sky: "#02100f",
    nebula: "#246b70",
    star: "#ddfff5",
    orbCore: "#f3fff9",
    orbHalo: "#9af6d1",
    accent: "#b9ffe8",
  },
  tender: {
    ground: "#090713",
    sky: "#080514",
    nebula: "#56336f",
    star: "#f5e8ff",
    orbCore: "#fff6fd",
    orbHalo: "#d7a5ff",
    accent: "#ffc5ee",
  },
  heavy: {
    ground: "#020309",
    sky: "#010207",
    nebula: "#1a2945",
    star: "#b8c7e6",
    orbCore: "#d9e6ff",
    orbHalo: "#4b78b8",
    accent: "#557bb0",
  },
  charged: {
    ground: "#08040d",
    sky: "#10050b",
    nebula: "#7b2d48",
    star: "#fff0d9",
    orbCore: "#fff6e8",
    orbHalo: "#ffb36e",
    accent: "#ffd08a",
  },
};

function clamp01(value: number | undefined, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function resolveMood(emotion: EmotionSignal | undefined, behavior: BehaviorSignal | undefined): SpatialMood {
  if (emotion?.mood) return emotion.mood;

  const valence = clamp01(emotion?.valence, 0.56);
  const arousal = clamp01(emotion?.arousal, 0.34);
  const recovery = clamp01(behavior?.recovery, 0.5);
  const load = clamp01(behavior?.cognitiveLoad, 0.36);

  if (valence < 0.32 && arousal < 0.44) return "heavy";
  if (arousal > 0.72 || load > 0.78) return "charged";
  if (recovery > 0.68 && valence > 0.52) return "hopeful";
  if (valence < 0.48 && recovery > 0.48) return "tender";
  if (load > 0.58 && arousal < 0.62) return "focused";
  return "calm";
}

function resolvePresence(interaction: InteractionSignal | undefined): SpatialPresence {
  if (interaction?.selectionActive) return "active";
  if (interaction?.hoverActive) return "near";
  return interaction?.presence ?? "idle";
}

function phaseOpacity(phase: ScenePhase) {
  if (phase === "HOME") return 1;
  if (phase === "ASCENT") return 0.42;
  return 0;
}

function starMixForPhase(phase: ScenePhase) {
  if (phase === "HOME") return 0.28;
  if (phase === "ASCENT") return 0.64;
  return 1;
}

export function createEnvironmentSignal(input: EnvironmentSignalInput): EnvironmentSignal {
  const emotion = input.emotion;
  const behavior = input.behavior;
  const interaction = input.interaction;

  const valence = clamp01(emotion?.valence, 0.56);
  const arousal = clamp01(emotion?.arousal, 0.34);
  const rawIntensity = clamp01(emotion?.intensity, arousal * 0.58 + Math.abs(valence - 0.5) * 0.42);
  const load = clamp01(behavior?.cognitiveLoad, 0.36);
  const recovery = clamp01(behavior?.recovery, 0.5);
  const rhythm = clamp01(behavior?.rhythm, 0.58);

  const presence = resolvePresence(interaction);
  const mood = resolveMood(emotion, behavior);
  const interactionLift = presence === "active" ? 0.12 : presence === "near" ? 0.06 : 0;
  const transitionLift = input.phase === "ASCENT" || input.phase === "REPLAY" ? 0.08 : 0;
  const emotionalIntensity = clamp01(rawIntensity * 0.64 + load * 0.18 + interactionLift + transitionLift, 0.42);
  const stability = clamp01(rhythm * 0.45 + recovery * 0.35 + (1 - load) * 0.2, 0.58);
  const aliveness = clamp01(emotionalIntensity * 0.48 + stability * 0.22 + (presence === "idle" ? 0.18 : 0.3), 0.42);
  const groundOpacity = phaseOpacity(input.phase);
  const skyOpacity = input.phase === "HOME" ? 1 : input.phase === "ASCENT" ? 0.72 : 0.24;

  return {
    mood,
    presence,
    emotionalIntensity,
    stability,
    aliveness,
    phase: input.phase,
    paletteRole: PHASE_PALETTE_ROLE[input.phase],
    palette: MOOD_PALETTES[mood],
    motion: {
      breathRate: 0.24 + aliveness * 0.6,
      pulseRate: 0.9 + emotionalIntensity * 0.82,
      drift: 0.012 + stability * 0.036,
    },
    scene: {
      skyOpacity,
      groundOpacity,
      orbEnergy: 0.72 + aliveness * 0.58,
      starMix: starMixForPhase(input.phase),
    },
  };
}

export function useEnvironmentSignal(overrides?: {
  emotion?: EmotionSignal;
  behavior?: BehaviorSignal;
  interaction?: Partial<InteractionSignal>;
}) {
  const phase = useSceneStore((s) => s.phase);
  const hoveredStarId = useSceneStore((s) => s.hoveredStarId);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const inputLocked = useSceneStore((s) => s.inputLocked);

  return useMemo(
    () =>
      createEnvironmentSignal({
        phase,
        emotion: overrides?.emotion,
        behavior: overrides?.behavior,
        interaction: {
          hoverActive: Boolean(hoveredStarId),
          selectionActive: Boolean(selectedStarId),
          inputLocked,
          ...overrides?.interaction,
        },
      }),
    [hoveredStarId, inputLocked, overrides?.behavior, overrides?.emotion, overrides?.interaction, phase, selectedStarId]
  );
}
