"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readSpatialCuratedDeckVaultManifest,
  writeSpatialCuratedDeckVaultManifest,
} from "@/spatial/curation/spatialCuratedDeckVaultIO";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultManifest } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

type VaultWindow = Window & {
  __URAI_SPATIAL_CURATED_DECK_VAULT__?: SpatialCuratedDeckVaultManifest;
};

export default function SpatialCuratedDeckVaultBootstrap() {
  const hydrate = useSpatialCuratedDeckVaultStore((s) => s.hydrate);
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialCuratedDeckVaultManifest());
    setReady(true);
  }, [hydrate]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.curated-deck-vault.v1" as const,
      activeEntryId,
      entries,
    }),
    [activeEntryId, entries],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialCuratedDeckVaultManifest(manifest);
    const target = window as VaultWindow;
    target.__URAI_SPATIAL_CURATED_DECK_VAULT__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-curated-deck-vault", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
