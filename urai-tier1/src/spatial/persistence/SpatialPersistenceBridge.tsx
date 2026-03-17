"use client";

import { useEffect, useMemo, useRef } from "react";
import { generateStars } from "@/spatial/data/stars";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { useXrSessionStore } from "@/spatial/xr/xrSessionStore";
import { useXrInputStore } from "@/spatial/xr/xrInputStore";
import { useArPlacementStore } from "@/spatial/xr/arPlacementStore";
import { useXrLocomotionStore } from "@/spatial/xr/xrLocomotionStore";
import { buildSpatialPersistenceSnapshot } from "@/spatial/persistence/buildSpatialPersistenceSnapshot";
import { writeSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceIO";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
};

export default function SpatialPersistenceBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const presenting = useXrSessionStore((s) => s.presenting);
  const hasHeadsetPose = useXrSessionStore((s) => s.hasHeadsetPose);

  const controllers = useXrInputStore((s) => s.controllers);
  const hands = useXrInputStore((s) => s.hands);
  const arPlacement = useArPlacementStore((s) => s.pose);
  const locomotion = useXrLocomotionStore((s) => s.pose);

  const starCountRef = useRef<number>(generateStars().length);

  const snapshot = useMemo(() => {
    return buildSpatialPersistenceSnapshot({
      mode,
      selectedStar,
      presenting,
      hasHeadsetPose,
      xrInput: {
        controllers,
        hands,
      },
      arPlacement,
      locomotion,
      starCount: starCountRef.current,
    });
  }, [
    mode,
    selectedStar,
    presenting,
    hasHeadsetPose,
    controllers,
    hands,
    arPlacement,
    locomotion,
  ]);

  const signature = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  useEffect(() => {
    writeSpatialPersistenceSnapshot(snapshot);
    const target = window as PersistenceWindow;
    target.__URAI_SPATIAL_PERSISTENCE__ = snapshot;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-persistence-saved", {
        detail: snapshot,
      }),
    );
  }, [snapshot, signature]);

  return null;
}
