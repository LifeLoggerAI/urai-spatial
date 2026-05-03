export type SpatialStoryBundleVaultEntry = {
  id: string;
  title?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type SpatialStoryBundleVaultManifest = {
  schema: "urai.spatial.story-bundle-vault.v1";
  activeEntryId: string | null;
  entries: SpatialStoryBundleVaultEntry[];
};

export function createDefaultSpatialStoryBundleVaultManifest(): SpatialStoryBundleVaultManifest {
  return { schema: "urai.spatial.story-bundle-vault.v1", activeEntryId: null, entries: [] };
}
