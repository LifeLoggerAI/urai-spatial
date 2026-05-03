import { buildMemoryImportReport } from "@/spatial/data-import/buildMemoryImportReport";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type MemoryImportState = {
  id: string;
  title: string;
  summary: string;
  readiness: number;
  dominantSignals: string[];
  gaps: string[];
};

export function resolveMemoryImportStateById(
  id: string | null | undefined
): MemoryImportState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const report = buildMemoryImportReport();

  const summary =
    report.importReadiness >= 70
      ? "Dataset normalization is strong enough for deeper synthesis and larger ingest passes."
      : "Dataset normalization is active, but more real nodes will strengthen clustering, traversal, and intelligence.";

  const dominantSignals = [
    report.dominantChapter,
    report.dominantTimeband,
    report.dominantEmotion,
  ].filter((value): value is string => Boolean(value));

  return {
    id,
    title,
    summary,
    readiness: report.importReadiness,
    dominantSignals,
    gaps: report.gaps,
  };
}
