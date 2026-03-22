import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export type SpatialCuratedDeckImportWindow = Window & {
  __URAI_SPATIAL_IMPORTED_CURATED_DECK__?: SpatialCuratedDeckExport;
};

export const SPATIAL_CURATED_DECK_IMPORTED_EVENT =
  "urai:spatial-curated-deck-imported";
export const SPATIAL_CURATED_DECK_VAULT_RESTORED_EVENT =
  "urai:spatial-curated-deck-vault-restored";

export type SpatialCuratedDeckImportedEventDetail = SpatialCuratedDeckExport;
export type SpatialCuratedDeckVaultRestoredEventDetail =
  SpatialCuratedDeckVaultEntry;

export type SpatialCuratedDeckImportStatus =
  | "idle"
  | "invalid curated deck"
  | "curated deck imported"
  | "curated deck import failed";
