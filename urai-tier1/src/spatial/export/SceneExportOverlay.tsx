
"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveSceneExportManifestById } from "./resolveSceneExportManifestById";

export default function SceneExportOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const mode = useSceneStore((s) => s.mode);

  const manifest = useMemo(
    () => resolveSceneExportManifestById(selectedStarId ?? undefined, mode),
    [selectedStarId, mode]
  );

  if (!manifest) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {manifest.label ?? manifest.title ?? "Scene export ready"}
      </div>
    </div>
  );
}
