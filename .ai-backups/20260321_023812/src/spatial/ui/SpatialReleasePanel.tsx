"use client";

import { useEffect } from "react";
import { resolveStarById, SPATIAL_STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import { appendRollbackPoint } from "../telemetry/SpatialAnalyticsBridge";
import { useXrStore } from "../unity/UnityRuntimePayloadBridge";
import type { SpatialPersistenceSnapshot } from "../types";

export function SpatialReleasePanel() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const xrState = useXrStore();

  useEffect(() => {
    const star = resolveStarById(selectedStar);
    const snapshot: SpatialPersistenceSnapshot = {
      schema: "urai.spatial.persistence.v1",
      savedAt: new Date().toISOString(),
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      selectedStarLabel: star?.label ?? null,
      presenting: xrState.presenting,
      hasHeadsetPose: xrState.hasHeadsetPose,
      xrInput: xrState.xrInput,
      arPlacement: { active: false, anchored: false },
      locomotion: { mode: "static", speed: 0 },
      starCount: SPATIAL_STARS.length,
      headset: { supported: false, connected: xrState.presenting },
      metrics: { fpsHint: 60, quality: "high" },
    };

    appendRollbackPoint({
      at: new Date().toISOString(),
      channel: "spatial",
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      snapshot,
    });
  }, [mode, selectedStar, xrState]);

  return null;
}

export default SpatialReleasePanel;
