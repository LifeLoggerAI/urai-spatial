
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveCinematicReplayById } from "./resolveCinematicReplayById";

export default function CinematicReplayOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const cinematic = useMemo(
    () => resolveCinematicReplayById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (!cinematic) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {cinematic.label ?? cinematic.title ?? "Cinematic replay ready"}
      </div>
    </div>
  );
}
