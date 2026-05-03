import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";
import { normalizeExternalRows, type CanonicalImportRow } from "@/spatial/ingest/normalizeExternalMemoryRows";

type LooseRecord = Record<string, unknown>;

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

export type MergeAction = {
  id: string;
  action: "insert" | "update" | "skip";
  reason: string;
};

export type BatchDiffAudit = {
  existingCount: number;
  incomingCount: number;
  matchedCount: number;
  newCount: number;
  changedCount: number;
  conflictingIds: string[];
  readiness: number;
  actions: MergeAction[];
};

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function existingById(dataset: LooseRecord[]): Map<string, LooseRecord> {
  const map = new Map<string, LooseRecord>();
  for (const row of dataset) {
    const id = str(row.id);
    if (id) map.set(id, row);
  }
  return map;
}

function isChanged(existing: LooseRecord, incoming: CanonicalImportRow): boolean {
  return (
    str(existing.title) !== incoming.title ||
    str(existing.summary) !== incoming.summary ||
    str(existing.chapter) !== incoming.chapter ||
    str(existing.arc) !== incoming.chapter ||
    str(existing.timeband) !== incoming.timeband ||
    str(existing.season) !== incoming.timeband ||
    str(existing.emotion) !== incoming.emotion ||
    str(existing.primaryEmotion) !== incoming.emotion ||
    str(existing.color) !== incoming.color ||
    str(existing.auraColor) !== incoming.color
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildBatchDiffAudit(): BatchDiffAudit {
  const dataset = getMemoryDataset() as LooseRecord[];
  const jsonRows = normalizeExternalRows("json", SAMPLE_JSON).canonicalRows;
  const csvRows = normalizeExternalRows("csv", SAMPLE_CSV).canonicalRows;
  const incoming = [...jsonRows, ...csvRows];

  const existingMap = existingById(dataset);
  const actions: MergeAction[] = [];
  const conflictingIds: string[] = [];

  let matchedCount = 0;
  let newCount = 0;
  let changedCount = 0;

  for (const row of incoming) {
    const existing = existingMap.get(row.id);

    if (!existing) {
      newCount += 1;
      actions.push({
        id: row.id,
        action: "insert",
        reason: "new canonical row",
      });
      continue;
    }

    matchedCount += 1;

    if (isChanged(existing, row)) {
      changedCount += 1;
      conflictingIds.push(row.id);
      actions.push({
        id: row.id,
        action: "update",
        reason: "incoming row differs from current dataset",
      });
    } else {
      actions.push({
        id: row.id,
        action: "skip",
        reason: "row already aligned",
      });
    }
  }

  const readiness = clamp(
    Math.round(
      newCount * 16 +
      matchedCount * 10 -
      conflictingIds.length * 9
    ),
    0,
    100
  );

  return {
    existingCount: dataset.length,
    incomingCount: incoming.length,
    matchedCount,
    newCount,
    changedCount,
    conflictingIds,
    readiness,
    actions,
  };
}
