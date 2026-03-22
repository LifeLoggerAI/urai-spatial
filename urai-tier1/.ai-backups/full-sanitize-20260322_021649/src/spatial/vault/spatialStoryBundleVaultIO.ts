import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  SPATIAL_STORY_BUNDLE_VAULT_MAX_ITEMS,
  SPATIAL_STORY_BUNDLE_VAULT_STORAGE_KEY,
  createDefaultSpatialStoryBundleVaultManifest,
  type SpatialStoryBundleVaultEntry,
  type SpatialStoryBundleVaultManifest,
} from "@/spatial/vault/spatialStoryBundleVaultTypes";

export function readSpatialStoryBundleVaultManifest(): SpatialStoryBundleVaultManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialStoryBundleVaultManifest();
  }

  try {
    const raw = window.localStorage.getItem(
      getSpatialScopedStorageKey(SPATIAL_STORY_BUNDLE_VAULT_STORAGE_KEY),
    );
    if (!raw) return createDefaultSpatialStoryBundleVaultManifest();

    const parsed = JSON.parse(raw) as SpatialStoryBundleVaultManifest;
    if (parsed?.schema !== "urai.spatial.story-bundle-vault.v1") {
      return createDefaultSpatialStoryBundleVaultManifest();
    }

    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.slice(-SPATIAL_STORY_BUNDLE_VAULT_MAX_ITEMS)
      : [];

    const activeEntryId = entries.some((item) => item.id === parsed.activeEntryId)
      ? parsed.activeEntryId
      : entries[0]?.id ?? null;

    return {
      schema: "urai.spatial.story-bundle-vault.v1",
      activeEntryId,
      entries,
    };
  } catch (_err) {
    return createDefaultSpatialStoryBundleVaultManifest();
  }
}

export function writeSpatialStoryBundleVaultManifest(
  manifest: SpatialStoryBundleVaultManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    const entries = manifest.entries.slice(-SPATIAL_STORY_BUNDLE_VAULT_MAX_ITEMS);
    const activeEntryId = entries.some((item) => item.id === manifest.activeEntryId)
      ? manifest.activeEntryId
      : entries[0]?.id ?? null;

    window.localStorage.setItem(
      getSpatialScopedStorageKey(SPATIAL_STORY_BUNDLE_VAULT_STORAGE_KEY),
      JSON.stringify({
        schema: "urai.spatial.story-bundle-vault.v1",
        activeEntryId,
        entries,
      }),
    );
  } catch (_err) {}
}

export function appendSpatialStoryBundleVaultEntry(
  manifest: SpatialStoryBundleVaultManifest,
  entry: SpatialStoryBundleVaultEntry,
): SpatialStoryBundleVaultManifest {
  const entries = [...manifest.entries, entry].slice(
    -SPATIAL_STORY_BUNDLE_VAULT_MAX_ITEMS,
  );

  return {
    schema: "urai.spatial.story-bundle-vault.v1",
    activeEntryId: entry.id,
    entries,
  };
}
