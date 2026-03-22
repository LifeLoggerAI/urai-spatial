import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveChapterSynthesisById } from "@/spatial/chapter/resolveChapterSynthesis";
import { resolveCausalInsightById } from "@/spatial/causal/resolveCausalInsight";
import { resolveNarrativeReplayById } from "@/spatial/narrative/resolveNarrativeReplay";

export type StoryArcState = {
  id: string;
  title: string;
  arcStage: "origin" | "threshold" | "fracture" | "return" | "integration";
  summary: string;
  readiness: number;
  arcSignal?: string;
  milestones: string[];
  tensions: string[];
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

function deriveStage(chapterLabel?: string, score?: number): StoryArcState["arcStage"] {
  const lower = (chapterLabel ?? "").toLowerCase();

  if (lower.includes("origin")) return "origin";
  if (lower.includes("fracture")) return "fracture";
  if (lower.includes("return")) return "return";
  if (lower.includes("becoming")) return "integration";
  if ((score ?? 0) >= 70) return "integration";
  if ((score ?? 0) >= 45) return "threshold";
  return "origin";
}

export function resolveStoryArcById(
  id: string | null | undefined
): StoryArcState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  const chapter = resolveChapterSynthesisById(id);
  const causal = resolveCausalInsightById(id);
  const narrative = resolveNarrativeReplayById(id);

  if (!memory) return undefined;

  const readiness = clamp(
    Math.round(
      (chapter?.readiness ?? 0) * 0.35 +
      (causal?.readiness ?? 0) * 0.45 +
      ((typeof memory.intensity === "number" ? memory.intensity : 0) * 4)
    ),
    0,
    100
  );

  const arcStage = deriveStage(memory.chapter, readiness);

  const summary =
    readiness >= 70
      ? "This memory now sits inside a readable story arc with chapter continuity, causal pressure, and narrative direction."
      : "Story arc detection is active, but more chapter and causal coverage will improve stage confidence.";

  const arcSignal =
    chapter?.dominantSignal ??
    memory.chapter ??
    memory.emotion ??
    memory.timeband;

  const milestones = unique([
    memory.chapter ? `chapter · ${memory.chapter}` : undefined,
    memory.timeband ? `timeband · ${memory.timeband}` : undefined,
    narrative?.kicker ? `narrative · ${narrative.kicker}` : undefined,
    chapter?.chapterCount ? `chapter count · ${chapter.chapterCount}` : undefined,
  ]).slice(0, 6);

  const tensions = unique([
    ...(causal?.hypotheses ?? []),
    memory.emotion ? `emotion pressure · ${memory.emotion}` : undefined,
  ]).slice(0, 5);

  return {
    id,
    title: `${memory.title} Story Arc`,
    arcStage,
    summary,
    readiness,
    arcSignal,
    milestones,
    tensions,
  };
}
