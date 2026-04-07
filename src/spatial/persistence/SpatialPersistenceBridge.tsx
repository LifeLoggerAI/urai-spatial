"use client";

import { useEffect } from "react";
import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import { useXrStore } from "../unity/UnityRuntimePayloadBridge";
import type { SpatialPersistenceSnapshot } from "../types";

export default function SpatialPersistenceBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const xrState = useXrStore();

  useEffect(() => {
    const star = resolveStarById(selectedStar);
    const snapshot: SpatialPersistenceSnapshot = {
      schema: "urai.spatial.persistence.v1" as const,
      savedAt: new Date().toISOString(),
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      selectedStar: selectedStar,
      selectedStarLabel: star?.label ?? null,
      presenting: xrState.presenting,
      hasHeadsetPose: xrState.hasHeadsetPose,
      xrInput: xrState.xrInput
    };

    try {
      window.localStorage.setItem("urai.spatial.persistence", JSON.stringify(snapshot));
      (window).__URAI_SPATIAL_PERSISTENCE__ = snapshot;
    } catch {}
  }, [mode, selectedStar, xrState]);

  return null;
}

declare global {
  interface Window {
    __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
  }
}
