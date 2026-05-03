import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveNarrativeReplayById } from "@/spatial/narrative/resolveNarrativeReplay";
import { resolveStoryArcById } from "@/spatial/storyarc/resolveStoryArc";
import { resolveSeasonalCycleById } from "@/spatial/seasonal/resolveSeasonalCycle";
import { resolveCausalInsightById } from "@/spatial/causal/resolveCausalInsight";

export type NarratorOrchestrationState = {
  id: string;
  title: string;
  voiceMode: "witness" | "guide" | "oracle" | "companion";
  sceneMode: "FOCUS" | "REPLAY";
  readiness: number;
  opener: string;
  body: string;
  cue: string;
  tokens: string[];
};

function unique(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deriveVoiceMode(
  sceneMode: "FOCUS" | "REPLAY",
  arcStage?: string,
  readiness?: number
): NarratorOrchestrationState["voiceMode"] {
  if (sceneMode === "REPLAY") return "witness";
  if ((arcStage ?? "").includes("integration")) return "oracle";
  if ((readiness ?? 0) >= 75) return "guide";
  return "companion";
}

export function resolveNarratorOrchestrationById(
  id: string | null | undefined,
  mode: string | null | undefined
): NarratorOrchestrationState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  const narrative = resolveNarrativeReplayById(id);
  const storyArc = resolveStoryArcById(id);
  const seasonal = resolveSeasonalCycleById(id);
  const causal = resolveCausalInsightById(id);

  if (!memory) return undefined;

  const sceneMode = mode === "REPLAY" ? "REPLAY" : "FOCUS";

  const readiness = clamp(
    Math.round(
      (storyArc?.readiness ?? 0) * 0.30 +
      (seasonal?.readiness ?? 0) * 0.25 +
      (causal?.readiness ?? 0) * 0.30 +
      ((typeof memory.intensity === "number" ? memory.intensity : 0) * 4)
    ),
    0,
    100
  );

  const voiceMode = deriveVoiceMode(sceneMode, storyArc?.arcStage, readiness);

  const opener =
    sceneMode === "REPLAY"

  const body =
    voiceMode === "oracle"
      ? "Patterns are converging across chapter, season, and emotion."
      : voiceMode === "guide"
      ? "There is enough continuity here to steer the next interpretation safely."
      : voiceMode === "witness"
      ? "The narrator should observe, anchor, and not over-direct the replay."
      : "The narrator should remain close, light, and context-aware.";

  const cue =
    narrative?.kicker ??
    seasonal?.cycleSignal ??
    storyArc?.arcSignal ??
    memory.chapter ??
    "narrative cue active";

  const tokens = unique([
    voiceMode,
    sceneMode,
    storyArc?.arcStage,
    seasonal?.seasonFocus,
    memory.emotion,
    memory.chapter,
  ]).slice(0, 6);

  return {
    id,
    voiceMode,
    sceneMode,
    readiness,
    opener,
    body,
    cue,
    tokens,
  };
}
