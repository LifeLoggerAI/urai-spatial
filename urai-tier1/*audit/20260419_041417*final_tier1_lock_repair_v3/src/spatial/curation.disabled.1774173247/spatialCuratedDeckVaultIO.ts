import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  createDefaultSpatialCuratedDeckVaultManifest,
  type SpatialCuratedDeckVaultEntry,
  type SpatialCuratedDeckVaultManifest,
} from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export function readSpatialCuratedDeckVaultManifest(): SpatialCuratedDeckVaultManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialCuratedDeckVaultManifest();
  }

  try {
    const raw = window.localStorage.getItem(
    );
    if (!raw) return createDefaultSpatialCuratedDeckVaultManifest();

    const parsed = JSON.parse(raw) as SpatialCuratedDeckVaultManifest;
    if (parsed?.schema !== "urai.spatial.curated-deck-vault.v1") {
      return createDefaultSpatialCuratedDeckVaultManifest();
    }

    const entries = Array.isArray(parsed.entries)
      : [];

    const activeEntryId = entries.some((item) => item.id === parsed.activeEntryId)
      ? parsed.activeEntryId
      : entries[0]?.id ?? null;

    return {
      schema: "urai.spatial.curated-deck-vault.v1",
      activeEntryId,
      entries,
    };
  } catch (_err) {
    return createDefaultSpatialCuratedDeckVaultManifest();
  }
}

export function writeSpatialCuratedDeckVaultManifest(
  manifest: SpatialCuratedDeckVaultManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    const activeEntryId = entries.some((item) => item.id === manifest.activeEntryId)
      ? manifest.activeEntryId
      : entries[0]?.id ?? null;

    window.localStorage.setItem(
      JSON.stringify({
        schema: "urai.spatial.curated-deck-vault.v1",
        activeEntryId,
        entries,
      }),
    );
  } catch (_err) {}
}

export function appendSpatialCuratedDeckVaultEntry(
  manifest: SpatialCuratedDeckVaultManifest,
  entry: SpatialCuratedDeckVaultEntry,
): SpatialCuratedDeckVaultManifest {
  const entries = [...manifest.entries, entry].slice(
  );

  return {
    schema: "urai.spatial.curated-deck-vault.v1",
    activeEntryId: entry.id,
    entries,
  };
}
