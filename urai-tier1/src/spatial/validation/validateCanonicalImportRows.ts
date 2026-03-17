import type { CanonicalImportRow } from "@/spatial/ingest/normalizeExternalMemoryRows";

export type CanonicalValidationReport = {
  totalRows: number;
  validRows: number;
  duplicateIds: string[];
  lowSignalRows: string[];
  warnings: string[];
  readiness: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function validateCanonicalImportRows(
  rows: CanonicalImportRow[]
): CanonicalValidationReport {
  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  const lowSignalRows: string[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    if (seenIds.has(row.id)) duplicateIds.push(row.id);
    seenIds.add(row.id);

    const weakSummary = row.summary.trim().length < 12;
    const weakChapter = row.chapter.trim().length < 3;
    const weakTimeband = row.timeband.trim().length < 3;
    const weakEmotion = row.emotion.trim().length < 3;

    if (weakSummary || weakChapter || weakTimeband || weakEmotion) {
      lowSignalRows.push(row.id);
    }

    if (row.intensity < 0 || row.intensity > 10) {
      warnings.push(`${row.id} intensity outside expected 0-10 range`);
    }

    if (!row.color.startsWith("#") && !row.color.startsWith("rgb")) {
      warnings.push(`${row.id} uses non-standard color token`);
    }
  }

  if (rows.length < 8) warnings.push("batch still small for strong normalization confidence");
  if (duplicateIds.length > 0) warnings.push("duplicate ids detected");
  if (lowSignalRows.length > 0) warnings.push("some rows have weak semantic coverage");

  const validRows = rows.length - duplicateIds.length;
  const readiness = clamp(
    Math.round(
      validRows * 12 -
      duplicateIds.length * 14 -
      lowSignalRows.length * 6 -
      warnings.length * 3
    ),
    0,
    100
  );

  return {
    totalRows: rows.length,
    validRows,
    duplicateIds,
    lowSignalRows,
    warnings,
    readiness,
  };
}
