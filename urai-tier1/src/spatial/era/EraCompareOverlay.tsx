"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveEraCompareById } from "./resolveEraCompareById";

export default function EraCompareOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const state = useMemo(
    () => resolveEraCompareById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (!state) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {state.label ?? state.title ?? "Era compare ready"}
      </div>
    </div>
  );
}
