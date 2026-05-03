
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveMemoryClusterById } from "./resolveMemoryClusterById";

export default function MemoryClusterOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const cluster = useMemo(
    () => resolveMemoryClusterById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (!cluster) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {cluster.label ?? cluster.title ?? "Memory cluster ready"}
      </div>
    </div>
  );
}
