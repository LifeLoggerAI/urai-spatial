import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import { createDefaultSpatialStoryBundleVaultManifest, type SpatialStoryBundleVaultEntry, type SpatialStoryBundleVaultManifest } from "@/spatial/vault/spatialStoryBundleVaultTypes";

const KEY = "spatial.story-bundle-vault";
const MAX_ENTRIES = 300;

export function readSpatialStoryBundleVaultManifest(): SpatialStoryBundleVaultManifest {
  if (typeof window === "undefined") return createDefaultSpatialStoryBundleVaultManifest();
  try {
    const raw = window.localStorage.getItem(getSpatialScopedStorageKey(KEY));
    if (!raw) return createDefaultSpatialStoryBundleVaultManifest();
    const parsed = JSON.parse(raw) as Partial<SpatialStoryBundleVaultManifest>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter((e): e is SpatialStoryBundleVaultEntry => !!e && typeof e.id === "string") : [];
    const activeEntryId = entries.some((item) => item.id === parsed.activeEntryId) ? parsed.activeEntryId ?? null : entries[0]?.id ?? null;
    return { schema: "urai.spatial.story-bundle-vault.v1", activeEntryId, entries };
  } catch {
    return createDefaultSpatialStoryBundleVaultManifest();
  }
}

export function writeSpatialStoryBundleVaultManifest(manifest: SpatialStoryBundleVaultManifest): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Array.isArray(manifest.entries) ? manifest.entries.slice(-MAX_ENTRIES) : [];
    const activeEntryId = entries.some((item) => item.id === manifest.activeEntryId) ? manifest.activeEntryId : entries[0]?.id ?? null;
    window.localStorage.setItem(getSpatialScopedStorageKey(KEY), JSON.stringify({ schema: "urai.spatial.story-bundle-vault.v1", activeEntryId, entries }));
  } catch {
    // noop
  }
}

export function appendSpatialStoryBundleVaultEntry(manifest: SpatialStoryBundleVaultManifest, entry: SpatialStoryBundleVaultEntry): SpatialStoryBundleVaultManifest {
  const entries = [...manifest.entries.filter((item) => item.id !== entry.id), entry].slice(-MAX_ENTRIES);
  return { schema: "urai.spatial.story-bundle-vault.v1", activeEntryId: entry.id, entries };
}
