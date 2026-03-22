"use client";

import { useEffect, useMemo, useState } from "react";
import { useSpatialArcStore } from "@/spatial/arcs/spatialArcStore";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareTypes";
import { buildSpatialSeasonalArcs } from "@/spatial/seasonal/buildSpatialSeasonalArcs";
import { readSpatialSeasonalArcManifest, writeSpatialSeasonalArcManifest } from "@/spatial/seasonal/spatialSeasonalArcIO";
import { useSpatialSeasonalArcStore } from "@/spatial/seasonal/spatialSeasonalArcStore";
import type { SpatialSeasonalArcManifest } from "@/spatial/seasonal/spatialSeasonalArcTypes";

type SeasonalWindow = Window & {
  __URAI_SPATIAL_SEASONAL_ARC_MANIFEST__?: SpatialSeasonalArcManifest;
};

export default function SpatialSeasonalArcBootstrap() {
  const compareSets = useSpatialCompareStore((s) => s.sets);
  const arcs = useSpatialArcStore((s) => s.arcs);

  const hydrate = useSpatialSeasonalArcStore((s) => s.hydrate);
  const activeSeasonalArcId = useSpatialSeasonalArcStore((s) => s.activeSeasonalArcId);
  const setSeasonalArcs = useSpatialSeasonalArcStore((s) => s.setSeasonalArcs);
  const seasonalArcs = useSpatialSeasonalArcStore((s) => s.seasonalArcs);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(readSpatialSeasonalArcManifest());
    setReady(true);
  }, [hydrate]);

  const derivedSeasonalArcs = useMemo(
    () =>
      buildSpatialSeasonalArcs({
        compareSets: compareSets.map((set, index) => ({
          ...set,
          label: set.label ?? set.summary ?? `Compare ${index + 1}`,
        })) as unknown as import("../compare/spatialCompareTypes").SpatialCompareSet[],
        arcs: arcs as unknown as Parameters<typeof buildSpatialSeasonalArcs>[0]["arcs"],
      }),
    [compareSets, arcs],
  );

  useEffect(() => {
    if (!ready) return;
    setSeasonalArcs(derivedSeasonalArcs);
  }, [ready, derivedSeasonalArcs, setSeasonalArcs]);

  const manifest = useMemo(
    () => ({
      schema: "urai.spatial.seasonal-arc.v1" as const,
      activeSeasonalArcId:
        seasonalArcs.some((item) => item.id === activeSeasonalArcId)
          ? activeSeasonalArcId
          : seasonalArcs[0]?.id ?? null,
      seasonalArcs,
    }),
    [activeSeasonalArcId, seasonalArcs],
  );

  useEffect(() => {
    if (!ready) return;
    writeSpatialSeasonalArcManifest(manifest);
    const target = window as SeasonalWindow;
    target.__URAI_SPATIAL_SEASONAL_ARC_MANIFEST__ = manifest;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-seasonal-arc-manifest", {
        detail: manifest,
      }),
    );
  }, [ready, manifest]);

  return null;
}
