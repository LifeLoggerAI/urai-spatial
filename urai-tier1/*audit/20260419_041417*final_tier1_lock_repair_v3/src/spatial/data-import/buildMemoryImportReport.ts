import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";

type LooseRecord = Record<string, unknown>;

export type MemoryImportReport = {
  totalNodes: number;
  uniqueChapters: number;
  uniqueTimebands: number;
  uniqueEmotions: number;
  importReadiness: number;
  dominantChapter?: string;
  dominantTimeband?: string;
  dominantEmotion?: string;
  gaps: string[];
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function countTop(values: string[]): string | undefined {
  if (values.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: string | undefined;
  let bestCount = -1;

  for (const [key, count] of counts.entries()) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }

  return best;
}

function uniqueCount(values: string[]): number {
  return new Set(values).size;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildMemoryImportReport(): MemoryImportReport {
  const dataset = getMemoryDataset() as LooseRecord[];

  const chapters = dataset
    .map((node) => str(node.chapter) ?? str(node.arc))
    .filter((value): value is string => Boolean(value));

  const timebands = dataset
    .map((node) => str(node.timeband) ?? str(node.season))
    .filter((value): value is string => Boolean(value));

  const emotions = dataset
    .map((node) => str(node.emotion) ?? str(node.primaryEmotion))
    .filter((value): value is string => Boolean(value));

  const totalNodes = dataset.length;
  const uniqueChapters = uniqueCount(chapters);
  const uniqueTimebands = uniqueCount(timebands);
  const uniqueEmotions = uniqueCount(emotions);

  const readiness = clamp(
    Math.round(
      totalNodes * 3 +
      uniqueChapters * 8 +
      uniqueTimebands * 7 +
      uniqueEmotions * 6
    ),
    0,
    100
  );

  const gaps: string[] = [];
  if (uniqueChapters < 3) gaps.push("more chapter coverage needed");
  if (uniqueTimebands < 3) gaps.push("more timeband coverage needed");
  if (uniqueEmotions < 3) gaps.push("more emotion variety needed");
  if (totalNodes < 12) gaps.push("dataset still small for strong adjacency");

  return {
    totalNodes,
    uniqueChapters,
    uniqueTimebands,
    uniqueEmotions,
    importReadiness: readiness,
    dominantChapter: countTop(chapters),
    dominantTimeband: countTop(timebands),
    dominantEmotion: countTop(emotions),
    gaps,
  };
}
