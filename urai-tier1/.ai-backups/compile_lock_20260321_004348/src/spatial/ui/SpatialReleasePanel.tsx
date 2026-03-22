"use client";

import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";
import type { RollbackPoint } from "../types";

declare global {
  interface Window {
    __URAI_SPATIAL_RELEASE__?: RollbackPoint;
  }
}

export default function SpatialReleasePanel() {
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const appendRollbackPoint = useSceneStore((state) => state.appendRollbackPoint);

  useEffect(() => {
    const point: RollbackPoint = {
      createdAt: new Date().toISOString(),
      channel: "tier1-lock",
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      snapshot: null,
    };
    appendRollbackPoint(point);
    window.__URAI_SPATIAL_RELEASE__ = point;
  }, [appendRollbackPoint, mode, selectedStar]);

  return null;
}
