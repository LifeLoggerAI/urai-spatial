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

export type RawImportRow = Record<string, unknown>;

export type ExternalRowsFormat = "json" | "csv" | string;

export type ExternalRowsResult = {
  canonicalRows: CanonicalImportRow[];
  rows: CanonicalImportRow[];
  rowCount: number;
  errors: string[];
  format: string;
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function makeId(row: RawImportRow, index: number): string {
  const existing = str(row.id, "");
  if (existing) return existing;

  const title = str(row.title, "memory");
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return "import-" + (slug || "memory") + "-" + index;
}

function canonicalizeRows(rows: RawImportRow[] | null | undefined): CanonicalImportRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row, index): CanonicalImportRow | undefined => {
      const title = str(row.title, "");
      if (!title) return undefined;

      return {
        id: makeId(row, index),
        title,
        summary: str(row.summary, "Imported memory row."),
        chapter: str(row.chapter, "Imported Chapter"),
        timeband: str(row.timeband, "Imported Timeband"),
        emotion: str(row.emotion, "neutral"),
        color: str(row.color, "#67e8f9"),
        intensity: num(row.intensity, 0.5),
      };
    })
    .filter((row): row is CanonicalImportRow => Boolean(row));
}

function parseJson(raw: string): RawImportRow[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RawImportRow[];
    if (parsed && typeof parsed === "object") return [parsed as RawImportRow];
    return [];
  } catch {
    return [];
  }
}

function parseCsv(raw: string): RawImportRow[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((value) => value.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: RawImportRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseRows(format: ExternalRowsFormat, raw: string): RawImportRow[] {
  if (format.toLowerCase().includes("csv")) return parseCsv(raw);
  return parseJson(raw);
}

export function normalizeExternalMemoryRows(
  rows: RawImportRow[] | null | undefined
): CanonicalImportRow[] {
  return canonicalizeRows(rows);
}

export function normalizeExternalRows(
  rows: RawImportRow[] | null | undefined
): CanonicalImportRow[];

export function normalizeExternalRows(
  format: ExternalRowsFormat,
  raw: string
): ExternalRowsResult;

export function normalizeExternalRows(
  first: ExternalRowsFormat | RawImportRow[] | null | undefined,
  second?: string
): CanonicalImportRow[] | ExternalRowsResult {
  if (typeof first === "string") {
    const format = first;
    const raw = typeof second === "string" ? second : "";
    const canonicalRows = canonicalizeRows(parseRows(format, raw));

    return {
      canonicalRows,
      rows: canonicalRows,
      rowCount: canonicalRows.length,
      errors: [],
      format,
    };
  }

  return canonicalizeRows(first);
}

export default normalizeExternalMemoryRows;
