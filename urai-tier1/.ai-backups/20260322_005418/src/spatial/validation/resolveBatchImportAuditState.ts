import { normalizeExternalRows } from "@/spatial/ingest/normalizeExternalMemoryRows";
import { validateCanonicalImportRows } from "@/spatial/validation/validateCanonicalImportRows";
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

export type BatchImportAuditState = {
  id: string;
  title: string;
  summary: string;
  readiness: number;
  totalRows: number;
  validRows: number;
  duplicateIds: string[];
  lowSignalRows: string[];
  warnings: string[];
};

export function resolveBatchImportAuditStateById(
  id: string | null | undefined
): BatchImportAuditState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const jsonValidation = normalizeExternalRows("json", SAMPLE_JSON);
  const csvValidation = normalizeExternalRows("csv", SAMPLE_CSV);

  const combinedRows = [
    ...jsonValidation.canonicalRows,
    ...csvValidation.canonicalRows,
  ];

  const report = validateCanonicalImportRows(combinedRows);

  return {
    id,
    title: `${memory.title} Batch Audit`,
    summary:
      report.readiness >= 70
        ? "Canonical validation is strong enough for larger batch ingest and downstream persistence."
        : "Canonical validation is active, but weak rows or duplicate risk still need attention before full ingest.",
    readiness: report.readiness,
    totalRows: report.totalRows,
    validRows: report.validRows,
    duplicateIds: report.duplicateIds,
    lowSignalRows: report.lowSignalRows,
    warnings: report.warnings,
  };
}
