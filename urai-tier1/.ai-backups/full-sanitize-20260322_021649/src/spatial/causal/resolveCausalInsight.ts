import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveMemoryClusterById } from "@/spatial/clustering/resolveMemoryCluster";
import { resolveLifeMapIntelligenceById } from "@/spatial/intelligence/resolveLifeMapIntelligence";
import { resolveChapterSynthesisById } from "@/spatial/chapter/resolveChapterSynthesis";

export type CausalInsight = {
  id: string;
  title: string;
  summary: string;
  readiness: number;
  drivers: string[];
  hypotheses: string[];
  evidence: string[];
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

export function resolveCausalInsightById(
  id: string | null | undefined
): CausalInsight | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  const cluster = resolveMemoryClusterById(id);
  const intelligence = resolveLifeMapIntelligenceById(id);
  const chapter = resolveChapterSynthesisById(id);

  if (!memory && !cluster && !intelligence && !chapter) return undefined;
  if (!memory) return undefined;

  const clusterCount = cluster?.neighbors.length ?? 0;
  const chapterCount = chapter?.chapterCount ?? 0;
  const score = intelligence?.score ?? 0;
  const intensity = typeof memory.intensity === "number" ? memory.intensity : 0;

  const drivers = unique([
    memory.chapter,
    memory.timeband,
    memory.emotion,
    chapter?.dominantSignal,
  ]).slice(0, 6);

  const hypotheses = unique([
    chapterCount > 1 ? `chapter continuity may be reinforcing this memory through ${memory.chapter}` : undefined,
    clusterCount > 0 ? `adjacent memories may amplify recall through ${clusterCount} related nodes` : undefined,
    memory.timeband ? `timeband gravity may be shaping retrieval around ${memory.timeband}` : undefined,
    memory.emotion ? `emotion signature may bias future pattern detection toward ${memory.emotion}` : undefined,
    score >= 60 ? "pattern score suggests higher-confidence causal linkage" : undefined,
  ]).slice(0, 5);

  const evidence = unique([
    chapterCount > 0 ? `chapter count ${chapterCount}` : undefined,
    clusterCount > 0 ? `neighbor count ${clusterCount}` : undefined,
    memory.intensity !== undefined ? `intensity ${intensity}` : undefined,
    score > 0 ? `pattern score ${score}` : undefined,
  ]).slice(0, 6);

  const readiness = clamp(
    Math.round(
      chapterCount * 14 +
      clusterCount * 10 +
      score * 0.45 +
      intensity * 4
    ),
    0,
    100
  );

  const summary =
    readiness >= 70
      ? "The current memory now has a usable causal scaffold across chapter, adjacency, emotion, and score signals."
      : "A causal scaffold is active, but stronger dataset coverage will improve confidence and directionality.";

  return {
    id,
    title: `${memory.title} Causal Insight`,
    summary,
    readiness,
    drivers,
    hypotheses,
    evidence,
  };
}
