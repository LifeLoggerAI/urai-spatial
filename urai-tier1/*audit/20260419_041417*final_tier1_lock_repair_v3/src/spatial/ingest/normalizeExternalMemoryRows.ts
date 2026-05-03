import { parseCsvRows, parseJsonRows, type RawImportRow } from "@/spatial/ingest/parseExternalMemoryRows";

export type CanonicalImportRow = {
  id: string;
  title: string;
  summary: string;
  chapter: string;
  timeband: string;
  emotion: string;
  color: string;
  intensity: number;
};

export type IngestValidation = {
  sourceType: "json" | "csv";
  rawCount: number;
  canonicalCount: number;
  invalidCount: number;
  canonicalRows: CanonicalImportRow[];
  errors: string[];
};

function str(value: any, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function num(value: any, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function toCanonical(row: RawImportRow, index: number): CanonicalImportRow | undefined {
  const title = str(row.title, "");
  if (!title) return undefined;

  return {
    title,
    summary: str(row.summary, "Imported memory row."),
    chapter: str(row.chapter, "Imported Chapter"),
    timeband: str(row.timeband, "Imported Band"),
    emotion: str(row.emotion, "neutral"),
    color: str(row.color, "#c9ddff"),
    intensity: num(row.intensity, 5),
  };
}

export function normalizeExternalRows(
  sourceType: "json" | "csv",
  text: string
): IngestValidation {
  const rawRows = sourceType === "json" ? parseJsonRows(text) : parseCsvRows(text);
  const canonicalRows: CanonicalImportRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, index) => {
    const normalized = toCanonical(row, index);
    if (normalized) {
      canonicalRows.push(normalized);
    } else {
    }
  });

  return {
    sourceType,
    rawCount: rawRows.length,
    canonicalCount: canonicalRows.length,
    invalidCount: rawRows.length - canonicalRows.length,
    canonicalRows,
    errors,
  };
}
