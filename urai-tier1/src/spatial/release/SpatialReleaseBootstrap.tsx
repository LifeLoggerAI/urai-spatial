"use client";

import { useEffect, useMemo, useState } from "react";
import { readSpatialReleaseManifest, writeSpatialReleaseManifest } from "@/spatial/release/spatialReleaseIO";
import { useSpatialReleaseStore } from "@/spatial/release/spatialReleaseStore";
import type { SpatialReleaseManifest } from "@/spatial/release/spatialReleaseTypes";

type ReleaseWindow = Window & {
};

export default function SpatialReleaseBootstrap() {
  const hydrate = useSpatialReleaseStore((s) => s.hydrate);
  const activeChannel = useSpatialReleaseStore((s) => s.activeChannel);
  const lastPromotedAt = useSpatialReleaseStore((s) => s.lastPromotedAt);
  const rollbackPoints = useSpatialReleaseStore((s) => s.rollbackPoints);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialReleaseManifest());
    setReady(true);
  }, [hydrate]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.release.v1" as const,
      activeChannel,
      lastPromotedAt,
      rollbackPoints,
    }),
    [activeChannel, lastPromotedAt, rollbackPoints],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialReleaseManifest(manifest);
    const target = window as ReleaseWindow;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-release-manifest", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
