"use client";

import { useEffect, useState } from "react";
import { useSpatialCompareStore } from "./spatialCompareStore";
import { createDefaultSpatialCompareManifest } from "./spatialCompareTypes";

export default function SpatialCompareBootstrap() {
  const hydrate = useSpatialCompareStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate(createDefaultSpatialCompareManifest());
    setReady(true);
  }, [hydrate]);

  return ready ? null : null;
}
