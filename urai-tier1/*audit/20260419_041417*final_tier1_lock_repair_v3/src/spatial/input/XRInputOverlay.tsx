
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveXRInputStateById } from "./resolveXRInputStateById";

export default function XRInputOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const mode = useSceneStore((s) => s.mode);

  const input = useMemo(
    () => resolveXRInputStateById(selectedStarId ?? undefined, mode),
    [selectedStarId, mode]
  );

  if (!input) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {input.label ?? input.title ?? "XR input ready"}
      </div>
    </div>
  );
}
