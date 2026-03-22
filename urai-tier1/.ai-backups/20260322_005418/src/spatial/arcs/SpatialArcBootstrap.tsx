"use client";

import { useEffect, useMemo, useState } from "react";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";
import { buildSpatialNarrativeArcs } from "@/spatial/arcs/buildSpatialNarrativeArcs";
import { readSpatialArcManifest, writeSpatialArcManifest } from "@/spatial/arcs/spatialArcIO";
import { useSpatialArcStore } from "@/spatial/arcs/spatialArcStore";
import type { SpatialArcManifest } from "@/spatial/arcs/spatialArcTypes";

type ArcWindow = Window & {
  __URAI_SPATIAL_ARC_MANIFEST__?: SpatialArcManifest;
};

export default function SpatialArcBootstrap() {
  const compareSets = useSpatialCompareStore((s) => s.sets);

  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const lenses = useSpatialLensStore((s) => s.lenses);

  const hydrate = useSpatialArcStore((s) => s.hydrate);
  const activeArcId = useSpatialArcStore((s) => s.activeArcId);
  const setArcs = useSpatialArcStore((s) => s.setArcs);
  const arcs = useSpatialArcStore((s) => s.arcs);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialArcManifest());
    setReady(true);
  }, [hydrate]);

  const activeLens = useMemo(
    () => lenses.find((item) => item.id === activeLensId) ?? null,
    [lenses, activeLensId],
  );

  const derivedArcs = useMemo(
    () =>
      buildSpatialNarrativeArcs({
        compareSets,
        activeLens,
      }),
    [compareSets, activeLens],
  );

  useEffect(() => {
    if (!ready) return;
    setArcs(derivedArcs);
  }, [ready, derivedArcs, setArcs]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.arc.v1" as const,
      activeArcId:
        arcs.some((item) => item.id === activeArcId)
          ? activeArcId
          : arcs[0]?.id ?? null,
      arcs,
    }),
    [activeArcId, arcs],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialArcManifest(manifest);
    const target = window as ArcWindow;
    target.__URAI_SPATIAL_ARC_MANIFEST__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-arc-manifest", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
