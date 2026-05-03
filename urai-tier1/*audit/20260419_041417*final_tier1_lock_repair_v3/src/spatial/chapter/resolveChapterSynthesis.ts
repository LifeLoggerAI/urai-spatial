import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

type LooseRecord = Record<string, unknown>;

export type ChapterSynthesis = {
  id: string;
  title: string;
  chapterLabel: string;
  summary: string;
  chapterCount: number;
  relatedTimebands: string[];
  relatedEmotions: string[];
  dominantSignal?: string;
  readiness: number;
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveChapterSynthesisById(
  id: string | null | undefined
): ChapterSynthesis | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const dataset = getMemoryDataset() as LooseRecord[];
  const chapterLabel = memory.chapter ?? "Unassigned Chapter";

  const chapterRows = dataset.filter((row) => {
    const rowChapter = str(row.chapter) ?? str(row.arc);
    return rowChapter === chapterLabel;
  });

  const timebands = unique(
    chapterRows
      .map((row) => str(row.timeband) ?? str(row.season))
      .filter((value): value is string => Boolean(value))
  ).slice(0, 6);

  const emotions = unique(
    chapterRows
      .map((row) => str(row.emotion) ?? str(row.primaryEmotion))
      .filter((value): value is string => Boolean(value))
  ).slice(0, 6);

  const dominantSignal = countTop([
    ...timebands,
    ...emotions,
  ]);

  const chapterCount = chapterRows.length;

  const summary =
    chapterCount > 1
      : "This memory currently stands alone in its chapter band, ready for richer future chapter grouping.";

  const readiness = clamp(
    Math.round(
      chapterCount * 18 +
      timebands.length * 8 +
      emotions.length * 8
    ),
    0,
    100
  );

  return {
    id,
    chapterLabel,
    summary,
    chapterCount,
    relatedTimebands: timebands,
    relatedEmotions: emotions,
    dominantSignal,
    readiness,
  };
}
