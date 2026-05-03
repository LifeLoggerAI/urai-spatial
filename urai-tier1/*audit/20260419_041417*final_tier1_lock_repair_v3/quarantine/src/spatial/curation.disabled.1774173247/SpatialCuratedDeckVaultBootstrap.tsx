"use client";

import { useEffect, useState } from "react";
import { useSpatialCuratedDeckVaultStore } from "./spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckVaultBootstrap() {
  const hydrate = useSpatialCuratedDeckVaultStore((s) => s.hydrate);
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;

  return (
    <div
      style={{ display: "none" }}
      data-spatial-curated-deck-vault-ready="true"
      data-active-entry-id={activeEntryId ?? ""}
      data-entry-count={entries.length}
    />
  );
}
