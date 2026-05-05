import type { EnvironmentSignal } from "../signals/environmentSignal";

export type ConsciousEnvironmentArchetype = "stillness" | "focus" | "recovery" | "threshold" | "spark";

export type ConsciousEnvironmentState = {
  archetype: ConsciousEnvironmentArchetype;
  narratorCue: string;
  environmentCue: string;
  shouldWhisper: boolean;
  shouldBloom: boolean;
  intensity: number;
  stability: number;
  aliveness: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function createConsciousEnvironmentState(env: EnvironmentSignal): ConsciousEnvironmentState {
  const intensity = clamp01(env.emotionalIntensity);
  const stability = clamp01(env.stability);
  const aliveness = clamp01(env.aliveness);

  let archetype: ConsciousEnvironmentArchetype = "stillness";

  if (env.phase === "ASCENT" || env.phase === "REPLAY" || intensity > 0.72) {
    archetype = "threshold";
  } else if (env.mood === "focused") {
    archetype = "focus";
  } else if (env.mood === "hopeful" || env.mood === "tender") {
    archetype = "recovery";
  } else if (env.mood === "charged" || aliveness > 0.68) {
    archetype = "spark";
  }

  const narratorCueByArchetype: Record<ConsciousEnvironmentArchetype, string> = {
    stillness: "The environment is holding steady.",
    focus: "The environment is narrowing into focus.",
    recovery: "The environment is softening into recovery.",
    threshold: "The environment senses a threshold moment.",
    spark: "The environment is brightening with momentum.",
  };

  const environmentCueByArchetype: Record<ConsciousEnvironmentArchetype, string> = {
    stillness: "settle",
    focus: "narrow-focus",
    recovery: "bloom-softly",
    threshold: "open-threshold",
    spark: "ignite-spark",
  };

  return {
    archetype,
    narratorCue: narratorCueByArchetype[archetype],
    environmentCue: environmentCueByArchetype[archetype],
    shouldWhisper: archetype === "threshold" || archetype === "recovery" || intensity > 0.66,
    shouldBloom: archetype === "recovery" || archetype === "spark" || aliveness > 0.72,
    intensity,
    stability,
    aliveness,
  };
}
