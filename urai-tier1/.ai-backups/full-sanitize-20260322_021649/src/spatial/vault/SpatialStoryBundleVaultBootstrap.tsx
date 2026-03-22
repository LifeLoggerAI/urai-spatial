"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readSpatialStoryBundleVaultManifest,
  writeSpatialStoryBundleVaultManifest,
} from "@/spatial/vault/spatialStoryBundleVaultIO";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";
import type { SpatialStoryBundleVaultManifest } from "@/spatial/vault/spatialStoryBundleVaultTypes";

type VaultWindow = Window & {
  __URAI_SPATIAL_STORY_BUNDLE_VAULT__?: SpatialStoryBundleVaultManifest;
};

export default function SpatialStoryBundleVaultBootstrap() {
  const hydrate = useSpatialStoryBundleVaultStore((s) => s.hydrate);
  const activeEntryId = useSpatialStoryBundleVaultStore((s) => s.activeEntryId);
  const entries = useSpatialStoryBundleVaultStore((s) => s.entries);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialStoryBundleVaultManifest());
    setReady(true);
  }, [hydrate]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.story-bundle-vault.v1" as const,
      activeEntryId,
      entries,
    }),
    [activeEntryId, entries],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialStoryBundleVaultManifest(manifest);
    const target = window as VaultWindow;
    target.__URAI_SPATIAL_STORY_BUNDLE_VAULT__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-story-bundle-vault", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
