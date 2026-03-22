"use client";

import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveStarById } from "../data/stars";

declare global {
  interface Window {
    __URAI_SPATIAL_ANALYTICS__?: Record<string, unknown>;
  }
}

export default function SpatialAnalyticsBridge() {
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const presenting = useSceneStore((state) => state.xrState.presenting);

  useEffect(() => {
    const star = resolveStarById(selectedStar);
    window.__URAI_SPATIAL_ANALYTICS__ = {
      schema: "urai.spatial.analytics.v1",
      generatedAt: new Date().toISOString(),
      mode,
      presenting,
      selectedStarId: selectedStar ?? null,
      selectedStarLabel: star?.label ?? null,
      selectedObjectId: selectedObject ?? null,
    };
  }, [mode, presenting, selectedObject, selectedStar]);

  return null;
}
