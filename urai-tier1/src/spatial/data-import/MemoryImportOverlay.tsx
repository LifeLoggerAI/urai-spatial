
"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveMemoryImportStateById } from "./resolveMemoryImportStateById";

export default function MemoryImportOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const state = useMemo(
    () => resolveMemoryImportStateById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (!state) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {state.label ?? state.title ?? "Memory import ready"}
      </div>
    </div>
  );
}
