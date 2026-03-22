"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveARPlacementStateById } from "./resolveARPlacementStateById";

export default function ARPlacementOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const ar = useMemo(
    () => resolveARPlacementStateById(selectedStarId || undefined, mode),
    [selectedStarId, mode]
  );

  if (!ar) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center">
      <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/70 backdrop-blur-md">
        {ar.label ?? "AR Placement Ready"}
      </div>
    </div>
  );
}
