import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveMemoryClusterById } from "@/spatial/clustering/resolveMemoryCluster";
import { resolveNarrativeReplayById } from "@/spatial/narrative/resolveNarrativeReplay";

export type LifeMapIntelligence = {
  id: string;
  title: string;
  summary: string;
  insight: string;
  hypotheses: string[];
  signals: string[];
  score: number;
  accent?: string;
};

function unique(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

export function resolveLifeMapIntelligenceById(
  id: string | null | undefined
): LifeMapIntelligence | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  const cluster = resolveMemoryClusterById(id);
  const narrative = resolveNarrativeReplayById(id);

  if (!memory && !cluster && !narrative) return undefined;

  const clusterCount = cluster?.neighbors.length ?? 0;
  const intensity = typeof memory?.intensity === "number" ? memory.intensity : 0;
  const score = Math.min(100, Math.round(clusterCount * 12 + intensity * 6 + (memory?.emotion ? 8 : 0)));

  const title =
    memory?.title
      : "LifeMap Intelligence";

  const summary =
    clusterCount > 0

  const insightParts = [
  ].filter((value): value is string => Boolean(value));

  const insight =
    insightParts.length > 0
      ? insightParts.join(", ") + "."
      : "Canonical LifeMap synthesis is active.";

  const hypotheses = unique([
    clusterCount >= 3 ? "Recurring chapter-level pattern detected" : undefined,
  ]).slice(0, 4);

  const signals = unique([
    memory?.chapter,
    memory?.timeband,
    memory?.emotion,
    ...(cluster?.axis ?? []),
  ]).slice(0, 6);

  return {
    id,
    title,
    summary,
    insight,
    hypotheses,
    signals,
    score,
    accent: memory?.color ?? narrative?.tone,
  };
}
