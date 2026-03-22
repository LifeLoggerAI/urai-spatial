"use client";

import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveStarById, STARS } from "../data/stars";
import type { SpatialPersistenceSnapshot } from "../types";

declare global {
  interface Window {
    __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
  }
}

function writeSpatialPersistenceSnapshot(snapshot: SpatialPersistenceSnapshot) {
  try {
    localStorage.setItem("urai.spatial.persistence", JSON.stringify(snapshot));
  } catch {
    // no-op
  }
}

export default function SpatialPersistenceBridge() {
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const xrState = useSceneStore((state) => state.xrState);

  useEffect(() => {
    const star = resolveStarById(selectedStar);
    const snapshot: SpatialPersistenceSnapshot = {
      schema: "urai.spatial.persistence.v1",
      savedAt: new Date().toISOString(),
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      selectedStarLabel: star?.label ?? null,
      presenting: xrState.presenting,
      hasHeadsetPose: !!xrState.headsetPose,
      xrInput: {
        handedness: xrState.xrInput.handedness ?? null,
        pointerActive: xrState.xrInput.pointerActive ?? false,
        squeezeActive: xrState.xrInput.squeezeActive ?? false,
        selectActive: xrState.xrInput.selectActive ?? false,
      },
      arPlacement: {
        anchored: false,
        position: null,
      },
      locomotion: {
        velocity: 0,
        active: false,
      },
      starCount: STARS.length,
      headset: {
        pose: xrState.headsetPose,
      },
      metrics: {
        frameBudget: 16.7,
        motionState: mode === "home" ? "idle" : "moving",
      },
    };

    writeSpatialPersistenceSnapshot(snapshot);
    window.__URAI_SPATIAL_PERSISTENCE__ = snapshot;
    window.dispatchEvent(new CustomEvent("urai:spatial-persistence", { detail: snapshot }));
  }, [mode, selectedStar, xrState]);

  return null;
}
