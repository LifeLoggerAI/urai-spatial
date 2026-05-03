import {
  normalizeExternalRows,
  type CanonicalImportRow,
} from "@/spatial/ingest/normalizeExternalMemoryRows";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

const SAMPLE_JSON = JSON.stringify(
  [
    {
      id: "sample-memory",
      title: "Sample memory",
      summary: "Imported memory row.",
      chapter: "Imported Chapter",
      timeband: "Imported Timeband",
      emotion: "neutral",
      color: "#67e8f9",
      intensity: 0.5,
    },
  ],
  null,
  2
);

export type ExternalIngestState = {
  id: string | null;
  title: string;
  label: string;
  rows: CanonicalImportRow[];
  rowCount: number;
  sampleJson: string;
  ready: boolean;
};

type LooseRecord = Record<string, unknown>;

function field(record: LooseRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function numberField(record: LooseRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function resolveExternalIngestState(
  starId: string | null | undefined,
  rows?: Record<string, unknown>[] | null
): ExternalIngestState {
  const id = starId ?? null;
  const memory = id ? resolveMemorySphereById(id) : undefined;
  const record = (memory ?? {}) as LooseRecord;

  const normalizedRows = normalizeExternalRows(
    Array.isArray(rows)
      ? rows
      : memory
        ? [
            {
              id: id ?? "memory",
              title: field(record, "title", "Imported memory"),
              summary: field(record, "summary", "Imported memory row."),
              chapter: field(record, "chapter", "Imported Chapter"),
              timeband: field(record, "timeband", "Imported Timeband"),
              emotion: field(record, "emotion", "neutral"),
              color: field(record, "color", "#67e8f9"),
              intensity: numberField(record, "intensity", 0.5),
            },
          ]
        : []
  );

  return {
    id,
    title: "External ingest",
    label: "External ingest ready",
    rows: normalizedRows,
    rowCount: normalizedRows.length,
    sampleJson: SAMPLE_JSON,
    ready: normalizedRows.length > 0,
  };
}

export function resolveExternalIngestStateById(
  starId: string | undefined
): ExternalIngestState {
  return resolveExternalIngestState(starId);
}

export default resolveExternalIngestState;
