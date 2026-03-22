"use client";

import { useEffect, useState } from "react";
import { useSpatialCompareStore } from "./spatialCompareStore";

export default function SpatialCompareBootstrap() {
  const hydrate = useSpatialCompareStore((s) => s.hydrate);
  const sets = useSpatialCompareStore((s) => s.sets);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;

  return (
    <div
      style={{ display: "none" }}
      data-spatial-compare-ready="true"
      data-compare-set-count={sets.length}
    />
  );
}
