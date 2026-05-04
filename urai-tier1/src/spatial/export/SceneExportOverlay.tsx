
"use client";

import { useMemo } from "react";
import { readSpatialRuntimeFlags } from "@/spatial/runtime/runtimeFlags";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveSceneExportManifestById } from "./resolveSceneExportManifestById";

export default function SceneExportOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const mode = useSceneStore((s) => s.mode);

  const manifest = useMemo(
    () => resolveSceneExportManifestById(selectedStarId ?? undefined, mode),
    [selectedStarId, mode]
  );

  const flags = readSpatialRuntimeFlags();
  if (!manifest) return null;
  if (flags.publicDemoMode && !flags.showDemoExportControls) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        XR manifest exported.
      </div>
    </div>
  );
}
