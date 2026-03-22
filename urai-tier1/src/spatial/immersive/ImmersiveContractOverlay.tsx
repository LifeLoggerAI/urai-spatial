"use client";

import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveImmersiveContractById } from "./resolveImmersiveContractById";

export default function ImmersiveContractOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const mode = useSceneStore((s) => s.mode);

  const contract = useMemo(
    () => resolveImmersiveContractById(selectedStarId ?? undefined, mode),
    [selectedStarId, mode]
  );

  if (!contract) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-12 z-20 flex justify-center">
      <div className="max-w-[720px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 backdrop-blur-md">
        {contract.label ?? contract.title ?? "Immersive contract ready"}
      </div>
    </div>
  );
}
