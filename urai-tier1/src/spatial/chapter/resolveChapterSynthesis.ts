import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type ChapterSynthesis = {
  id: string;
  title: string;
  summary: string;
  chapterCount: number;
  dominantSignal: string;
};

type LooseRecord = Record<string, unknown>;

function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function resolveChapterSynthesis(
  chapterId: string | number | null | undefined,
  memoryCount: number = 1
): ChapterSynthesis | undefined {
  if (chapterId === null || chapterId === undefined || chapterId === "") {
    return undefined;
  }

  const id = String(chapterId);
  const memory = resolveMemorySphereById(id);
  const record = (memory ?? {}) as LooseRecord;

  const safeMemoryCount =
    typeof memoryCount === "number" && Number.isFinite(memoryCount)
      ? memoryCount
      : 1;

  const dominantSignal =
    stringFrom(record.emotion) ||
    stringFrom(record.tone) ||
    stringFrom(record.chapter) ||
    "memory";

  return {
    id,
    title: safeMemoryCount > 1 ? "Chapter Synthesis" : "Single Memory Chapter",
    summary:
      safeMemoryCount > 1
        ? "This chapter has enough linked memory signals to support synthesis."
        : "This memory currently stands alone in its chapter band, ready for richer future chapter grouping.",
    chapterCount: safeMemoryCount,
    dominantSignal,
  };
}

export function resolveChapterSynthesisById(
  id: string | null | undefined
): ChapterSynthesis | undefined {
  return resolveChapterSynthesis(id, 1);
}

export default resolveChapterSynthesis;
