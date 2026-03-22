"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveLifeMapIntelligenceById } from "./resolveLifeMapIntelligenceById";

export default function LifeMapIntelligenceOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const intel = useMemo(
    () => resolveLifeMapIntelligenceById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (!intel) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {intel.label ?? intel.title ?? "LifeMap intelligence ready"}
      </div>
    </div>
  );
}
