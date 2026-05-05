import { useMemo } from "react";
import { useSceneStore, type ScenePhase } from "../state/sceneStore";
import type { GroundMood, GroundPresence } from "../scene/GroundWorld";

export type EmotionSignal = {
  mood?: GroundMood;
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
  presence?: GroundPresence;
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

export type EnvironmentSignal = {
  mood: GroundMood;
  presence: GroundPresence;
  emotionalIntensity: number;
  stability: number;
  aliveness: number;
  phase: ScenePhase;
  paletteRole: "home" | "transition" | "map" | "focus" | "replay";
};

const PHASE_PALETTE_ROLE: Record<ScenePhase, EnvironmentSignal["paletteRole"]> = {
  HOME: "home",
  ASCENT: "transition",
  LIFEMAP: "map",
  FOCUS: "focus",
  REPLAY: "replay",
};

function clamp01(value: number | undefined, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function resolveMood(emotion: EmotionSignal | undefined, behavior: BehaviorSignal | undefined): GroundMood {
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

function resolvePresence(interaction: InteractionSignal | undefined): GroundPresence {
  if (interaction?.selectionActive) return "active";
  if (interaction?.hoverActive) return "near";
  return interaction?.presence ?? "idle";
}

export function createEnvironmentSignal(input: EnvironmentSignalInput): EnvironmentSignal {
  const emotion = input.emotion;
  const behavior = input.behavior;
  const interaction = input.interaction;

  const valence = clamp01(emotion?.valence, 0.56);
  const arousal = clamp01(emotion?.arousal, 0.34);
  const rawIntensity = clamp01(emotion?.intensity, (arousal * 0.58) + (Math.abs(valence - 0.5) * 0.42));
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

  return {
    mood,
    presence,
    emotionalIntensity,
    stability,
    aliveness,
    phase: input.phase,
    paletteRole: PHASE_PALETTE_ROLE[input.phase],
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
