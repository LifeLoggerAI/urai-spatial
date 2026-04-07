export type RawImportRow = {
  id?: string;
  title?: string;
  summary?: string;
  chapter?: string;
  timeband?: string;
  emotion?: string;
  color?: string;
  intensity?: number;
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function num(value: any): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

export function parseJsonRows(jsonText: string): RawImportRow[] {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => {
      const source = (row ?? {}) as Record<string, unknown>;
      return {
        id: str(source.id),
        title: str(source.title),
        summary: str(source.summary),
        chapter: str(source.chapter),
        timeband: str(source.timeband),
        emotion: str(source.emotion),
        color: str(source.color),
        intensity: num(source.intensity),
      };
    });
  } catch {
    return [];
  }
}

export function parseCsvRows(csvText: string): RawImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((part) => stripQuotes(part).toLowerCase());
  const rows = lines.slice(1);

  return rows.map((line) => {
    const values = line.split(",").map((part) => stripQuotes(part));
    const record: Record<string, string> = {};

    for (let i = 0; i < header.length; i += 1) {
      record[header[i]] = values[i] ?? "";
    }

    return {
      id: str(record.id),
      title: str(record.title),
      summary: str(record.summary),
      chapter: str(record.chapter),
      timeband: str(record.timeband),
      emotion: str(record.emotion),
      color: str(record.color),
      intensity: num(record.intensity),
    };
  });
}
