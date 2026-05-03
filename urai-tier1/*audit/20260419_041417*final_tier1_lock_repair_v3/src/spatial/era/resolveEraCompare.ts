import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";
import { resolveStoryArcById } from "@/spatial/storyarc/resolveStoryArc";

type LooseRecord = Record<string, unknown>;

export type EraCompareState = {
  id: string;
  title: string;
  compareTargetTitle?: string;
  compareBasis: string;
  summary: string;
  readiness: number;
  similarities: string[];
  differences: string[];
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

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

function scoreCandidate(seed: LooseRecord, node: LooseRecord): number {
  let score = 0;

  const seedChapter = str(seed.chapter);
  const seedTimeband = str(seed.timeband);
  const seedEmotion = str(seed.emotion);
  const seedColor = str(seed.color);

  const nodeChapter = str(node.chapter) ?? str(node.arc);
  const nodeTimeband = str(node.timeband) ?? str(node.season);
  const nodeEmotion = str(node.emotion) ?? str(node.primaryEmotion);
  const nodeColor = str(node.color) ?? str(node.auraColor);

  if (seedChapter && nodeChapter === seedChapter) score += 4;
  if (seedTimeband && nodeTimeband === seedTimeband) score += 3;
  if (seedEmotion && nodeEmotion === seedEmotion) score += 2;
  if (seedColor && nodeColor === seedColor) score += 1;

  return score;
}

export function resolveEraCompareById(
  id: string | null | undefined
): EraCompareState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const storyArc = resolveStoryArcById(id);
  const dataset = getMemoryDataset() as LooseRecord[];

  const compareTarget = dataset
    .filter((row) => str(row.id) && str(row.id) !== id)
    .map((row) => ({
      row,
      score: scoreCandidate(memory as unknown as LooseRecord, row),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (str(a.row.title) ?? "").localeCompare(str(b.row.title) ?? ""))
    .at(0);

  const compareRow = compareTarget?.row;
  const compareTitle =
    str(compareRow?.title) ??
    str(compareRow?.label) ??
    str(compareRow?.name);

  const similarities = unique([
  ]).slice(0, 6);

  const differences = unique([
  ]).slice(0, 6);

  const readiness = clamp(
    Math.round(
      (compareTarget?.score ?? 0) * 18 +
      similarities.length * 10 +
      differences.length * 6
    ),
    0,
    100
  );

  const compareBasis =
    similarities.length > 0
      ? similarities[0]
      : "nearest era match";

  const summary =
    compareTitle

  return {
    id,
    compareTargetTitle: compareTitle,
    compareBasis,
    summary,
    readiness,
    similarities,
    differences,
  };
}
