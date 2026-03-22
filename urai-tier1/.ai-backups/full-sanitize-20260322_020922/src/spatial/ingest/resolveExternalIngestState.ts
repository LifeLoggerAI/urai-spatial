import { normalizeExternalRows } from "@/spatial/ingest/normalizeExternalMemoryRows";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

const SAMPLE_JSON = JSON.stringify(
  [
    {
      id: "ext-json-1",
      title: "Imported Dawn Memory",
      summary: "External JSON import row.",
      chapter: "Origins",
      timeband: "Dawn",
      emotion: "curious",
      color: "#c9ddff",
      intensity: 6
    },
    {
      id: "ext-json-2",
      title: "Imported Threshold Memory",
      summary: "Second imported row.",
      chapter: "Becoming",
      timeband: "Night",
      emotion: "focused",
      color: "#ffd98a",
      intensity: 7
    }
  ],
  null,
  2
);

const SAMPLE_CSV = [
  "id,title,summary,chapter,timeband,emotion,color,intensity",
  "ext-csv-1,CSV Echo,External CSV import row,Fracture,Autumn,reflective,#f8c7d8,4",
  "ext-csv-2,CSV Return,Second CSV import row,Return,Spring,steady,#e8f7df,5"
].join("\n");

export type ExternalIngestState = {
  id: string;
  title: string;
  summary: string;
  jsonCanonicalCount: number;
  csvCanonicalCount: number;
  invalidCount: number;
  readiness: number;
  errors: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveExternalIngestStateById(
  id: string | null | undefined
): ExternalIngestState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const jsonValidation = normalizeExternalRows("json", SAMPLE_JSON);
  const csvValidation = normalizeExternalRows("csv", SAMPLE_CSV);

  const readiness = clamp(
    Math.round(
      jsonValidation.canonicalCount * 18 +
      csvValidation.canonicalCount * 18 -
      (jsonValidation.invalidCount + csvValidation.invalidCount) * 8
    ),
    0,
    100
  );

  return {
    id,
    title: `${memory.title} External Ingest`,
    summary: "External JSON and CSV ingest contracts are now normalized into canonical memory rows.",
    jsonCanonicalCount: jsonValidation.canonicalCount,
    csvCanonicalCount: csvValidation.canonicalCount,
    invalidCount: jsonValidation.invalidCount + csvValidation.invalidCount,
    readiness,
    errors: [...jsonValidation.errors, ...csvValidation.errors],
  };
}
