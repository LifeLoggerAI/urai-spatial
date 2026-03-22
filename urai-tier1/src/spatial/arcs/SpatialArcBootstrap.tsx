"use client";

import { useEffect, useState } from "react";
import { useSpatialArcStore } from "./spatialArcStore";

export default function SpatialArcBootstrap() {
  const hydrate = useSpatialArcStore((s) => s.hydrate);
  const activeArcId = useSpatialArcStore((s) => s.activeArcId);
  const setArcs = useSpatialArcStore((s) => s.setArcs);
  const arcs = useSpatialArcStore((s) => s.arcs);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setArcs(arcs ?? []);
    setReady(true);
  }, [hydrate, setArcs]);

  if (!ready) return null;

  return (
    <div
      style={{ display: "none" }}
      data-spatial-arc-ready="true"
      data-active-arc-id={activeArcId ?? ""}
      data-arc-count={arcs.length}
    />
  );
}
