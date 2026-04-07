import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export type SpatialCuratedDeckImportWindow = Window & {
};

  "urai:spatial-curated-deck-imported";
  "urai:spatial-curated-deck-vault-restored";

export type SpatialCuratedDeckImportedEventDetail = SpatialCuratedDeckExport;
export type SpatialCuratedDeckVaultRestoredEventDetail =
  SpatialCuratedDeckVaultEntry;

export type SpatialCuratedDeckImportStatus =
  | "idle"
  | "invalid curated deck"
  | "curated deck imported"
  | "curated deck import failed";
