"use client";

import { useEffect } from "react";
import { resolveStarById, SPATIAL_STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import { useXrStore } from "../unity/UnityRuntimePayloadBridge";
import type { SpatialPersistenceSnapshot } from "../types";

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
};

export function writeSpatialPersistenceSnapshot(snapshot: SpatialPersistenceSnapshot) {
  try {
    if (typeof window !== "undefined") {
    }
  } catch {}
}

export function SpatialPersistenceBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const xrState = useXrStore();

  useEffect(() => {
    const star = resolveStarById(selectedStar);
    const snapshot: SpatialPersistenceSnapshot = {
      schema: "urai.spatial.persistence.v1",
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      selectedStarLabel: star?.label ?? null,
      presenting: xrState.presenting,
      hasHeadsetPose: xrState.hasHeadsetPose,
      xrInput: {
        handedness: xrState.xrInput.handedness,
        : xrState.xrInput.,
        squeezeActive: xrState.xrInput.squeezeActive,
        selectActive: xrState.xrInput.selectActive
      },
      arPlacement: { active: false, anchored: false },
      locomotion: { mode: "static", speed: 0 },
      starCount: SPATIAL_STARS.length,
      headset: { supported: false, connected: xrState.presenting },
      metrics: { fpsHint: 60, quality: "high" }
    };

    writeSpatialPersistenceSnapshot(snapshot);

    const target = window as PersistenceWindow;
    target.__URAI_SPATIAL_PERSISTENCE__ = snapshot;
    window.dispatchEvent(new CustomEvent("urai:spatial-persistence", { detail: snapshot }));
  }, [mode, selectedStar, xrState]);

  return null;
}

export default SpatialPersistenceBridge;
