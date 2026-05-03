"use client";

import { useMemo } from "react";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";

export default function SpatialComparePanel() {
  const sets = useSpatialCompareStore((s) => s.sets);

  const latestSet = useMemo(
    () => (sets.length > 0 ? sets[sets.length - 1] : null),
    [sets]
  );

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 12,
        background: "rgba(0,0,0,0.28)",
        color: "white",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        Spatial Compare
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
        sets: {sets.length}
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        latest: {latestSet ? "available" : "n/a"}
      </div>
    </div>
  );
}
