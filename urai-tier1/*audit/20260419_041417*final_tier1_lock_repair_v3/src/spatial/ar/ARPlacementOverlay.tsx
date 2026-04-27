
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import { resolveARPlacementStateById } from "./resolveARPlacementStateById";

export default function ARPlacementOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const selectedStar = resolveStarByIdSafe(selectedStarId ?? undefined);

  const ar = useMemo(
    () => resolveARPlacementStateById(selectedStar ?? undefined, mode),
    [selectedStar, mode]
  );

  if (!ar) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center">
      <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] tracking-wider text-white/70 backdrop-blur-md">
        {ar.label || "AR Placement Ready"}
      </div>
    </div>
  );
}
