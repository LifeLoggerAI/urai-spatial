"use client";

import { useEffect, useMemo, useState } from "react";
import { readSpatialCompareManifest, writeSpatialCompareManifest } from "@/spatial/compare/spatialCompareIO";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import type { SpatialCompareManifest } from "@/spatial/compare/spatialCompareTypes";

type CompareWindow = Window & {
  __URAI_SPATIAL_COMPARE_MANIFEST__?: SpatialCompareManifest;
};

export default function SpatialCompareBootstrap() {
  const hydrate = useSpatialCompareStore((s) => s.hydrate);
  const sets = useSpatialCompareStore((s) => s.sets);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialCompareManifest());
    setReady(true);
  }, [hydrate]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.compare.v1" as const,
      sets,
    }),
    [sets],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialCompareManifest(manifest);
    const target = window as CompareWindow;
    target.__URAI_SPATIAL_COMPARE_MANIFEST__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-compare-manifest", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
