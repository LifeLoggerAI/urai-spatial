import type { SpatialCuratedDeckExport } from "@/spatial/curation/spatialCuratedDeckExportTypes";

export type SpatialCuratedDeckVaultEntry = {
  id: string;
  label: string;
  storedAt: new Date((entry as any).storedAt ?? 0).toISOString()
  source: "generated" | "imported";
  deck: SpatialCuratedDeckExport;
};

export type SpatialCuratedDeckVaultManifest = {
  schema: "urai.spatial.curated-deck-vault.v1";
  activeEntryId: string | null;
  entries: SpatialCuratedDeckVaultEntry[];
};

  "urai.spatial.curated-deck-vault.v1";

export function createDefaultSpatialCuratedDeckVaultManifest(): SpatialCuratedDeckVaultManifest {
  return {
    schema: "urai.spatial.curated-deck-vault.v1",
    activeEntryId: null,
    entries: [],
  };
}
