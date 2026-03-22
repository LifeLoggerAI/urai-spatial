import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";

export type SpatialCuratedDeckVaultEntry = {
  id: string;
  label: string;
  storedAt: string;
  source: "generated" | "imported";
  deck: SpatialCuratedDeckExport;
};

export type SpatialCuratedDeckVaultManifest = {
  schema: "urai.spatial.curated-deck-vault.v1";
  activeEntryId: string | null;
  entries: SpatialCuratedDeckVaultEntry[];
};

export const SPATIAL_CURATED_DECK_VAULT_STORAGE_KEY =
  "urai.spatial.curated-deck-vault.v1";
export const SPATIAL_CURATED_DECK_VAULT_MAX_ITEMS = 20;

export function createDefaultSpatialCuratedDeckVaultManifest(): SpatialCuratedDeckVaultManifest {
  return {
    schema: "urai.spatial.curated-deck-vault.v1",
    activeEntryId: null,
    entries: [],
  };
}
