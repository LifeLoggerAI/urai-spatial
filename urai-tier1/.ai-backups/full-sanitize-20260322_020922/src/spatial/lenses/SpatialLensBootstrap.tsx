"use client";

import { useEffect, useMemo, useState } from "react";
import { buildSpatialTimelineLenses } from "@/spatial/lenses/buildSpatialTimelineLenses";
import { readSpatialLensManifest, writeSpatialLensManifest } from "@/spatial/lenses/spatialLensIO";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import type { SpatialLensManifest } from "@/spatial/lenses/spatialLensTypes";

type LensWindow = Window & {
  __URAI_SPATIAL_LENS_MANIFEST__?: SpatialLensManifest;
};

export default function SpatialLensBootstrap() {
  const compareSets = useSpatialCompareStore((s) => s.sets);

  const hydrate = useSpatialLensStore((s) => s.hydrate);
  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const setLenses = useSpatialLensStore((s) => s.setLenses);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialLensManifest());
    setReady(true);
  }, [hydrate]);

  const derivedLenses = useMemo(
    () => buildSpatialTimelineLenses(compareSets),
    [compareSets],
  );

  useEffect(() => {
    if (!ready) return;
    setLenses(derivedLenses);
  }, [ready, derivedLenses, setLenses]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.lens.v1" as const,
      activeLensId:
        lenses.some((item) => item.id === activeLensId)
          ? activeLensId
          : lenses[0]?.id ?? null,
      lenses,
    }),
    [activeLensId, lenses],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialLensManifest(manifest);
    const target = window as LensWindow;
    target.__URAI_SPATIAL_LENS_MANIFEST__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-lens-manifest", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
