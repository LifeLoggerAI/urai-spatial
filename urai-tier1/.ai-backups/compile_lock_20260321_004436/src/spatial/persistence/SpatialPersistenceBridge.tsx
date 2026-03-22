"use client";

import { useEffect } from "react";
import type { SpatialPersistenceSnapshot } from "../types";
import { useSceneStore } from "../state/sceneStore";
import { STARS } from "../data/stars";

declare global {
  interface Window {
    __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
  }
}

export default function SpatialPersistenceBridge() {
  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const presenting = useSceneStore((state) => state.xrState.presenting);

  useEffect(() => {
    const snapshot: SpatialPersistenceSnapshot = {
      schema: "urai.spatial.persistence.v1",
      sceneMode: mode,
      phase,
      selectedStarId: selectedStar,
      selectedObjectId: selectedObject,
      presenting,
      starCount: STARS.length,
    };

    try {
      window.localStorage.setItem("urai.spatial.persistence", JSON.stringify(snapshot));
    } catch {}

    window.__URAI_SPATIAL_PERSISTENCE__ = snapshot;
  }, [mode, phase, presenting, selectedObject, selectedStar]);

  return null;
}
