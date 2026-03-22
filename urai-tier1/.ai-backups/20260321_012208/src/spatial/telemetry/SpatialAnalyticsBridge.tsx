"use client";

import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";

declare global {
  interface Window {
    __URAI_SPATIAL_ANALYTICS__?: Record<string, unknown>;
  }
}

export default function SpatialAnalyticsBridge() {
  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const presenting = useSceneStore((state) => state.xrState.presenting);

  useEffect(() => {
    window.__URAI_SPATIAL_ANALYTICS__ = {
      schema: "urai.spatial.analytics.v1",
      mode,
      phase,
      selectedStarId: selectedStar,
      selectedObjectId: selectedObject,
      presenting,
      generatedAt: new Date().toISOString(),
    };
  }, [mode, phase, presenting, selectedObject, selectedStar]);

  return null;
}
