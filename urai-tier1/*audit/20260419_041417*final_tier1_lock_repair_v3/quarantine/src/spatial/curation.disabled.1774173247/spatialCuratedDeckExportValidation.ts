import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";

export function isSpatialCuratedDeckExport(
  value: any,
): value is SpatialCuratedDeckExport {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return (
    v.schema === "urai.spatial.curated-deck-export.v1" &&
    typeof v.exportedAt === "string" &&
    !!v.account &&
    typeof v.account === "object" &&
    typeof v.cardCount === "number" &&
    Array.isArray(v.cards) &&
    typeof v.summaryText === "string"
  );
}
