"use client";

import { useEffect, useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { useXrSessionStore } from "../xr/xrSessionStore";
import { writeSpatialPersistenceSnapshot } from "./spatialPersistenceStore";

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: unknown;
};

function resolveSelectedStarLabel(
  selectedStar: unknown,
  starPools: unknown[],
): string | null {
  if (
    selectedStar &&
    typeof selectedStar === "object" &&
    "label" in selectedStar &&
    typeof (selectedStar as { label?: unknown }).label === "string"
  ) {
    return (selectedStar as { label: string }).label;
  }

  const selectedId =
    typeof selectedStar === "string"
      ? selectedStar
      : selectedStar &&
          typeof selectedStar === "object" &&
          "id" in selectedStar &&
          typeof (selectedStar as { id?: unknown }).id === "string"
        ? (selectedStar as { id: string }).id
        : null;

  if (!selectedId) return null;

  for (const pool of starPools) {
    if (!Array.isArray(pool)) continue;
    for (const item of pool) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as { id?: unknown; label?: unknown; title?: unknown; name?: unknown };
      if (candidate.id === selectedId) {
        if (typeof candidate.label === "string") return candidate.label;
        if (typeof candidate.title === "string") return candidate.title;
        if (typeof candidate.name === "string") return candidate.name;
      }
    }
  }

  return null;
}

export default function SpatialPersistenceBridge() {
  const persistSnapshots = true;

  const sceneMode = useSceneStore((s: any) => s.mode);
  const selectedStar = useSceneStore((s: any) => s.selectedStar);
  const starPools = useSceneStore((s: any) => [
    s.stars,
    s.starfield,
    s.starNodes,
    s.starCatalog,
  ]);

  const presenting = useXrSessionStore((s: any) => Boolean(s.presenting));
  const hasHeadsetPose = useXrSessionStore((s: any) => Boolean(s.hasHeadsetPose));
  const xrInput = useXrSessionStore((s: any) => s.xrInput ?? null);
  const arPlacement = useXrSessionStore((s: any) => s.arPlacement ?? null);
  const locomotion = useXrSessionStore((s: any) => s.locomotion ?? null);
  const handoffMode = useXrSessionStore((s: any) => s.handoffMode ?? "none");

  const selectedStarId = useMemo<string | null>(() => {
    if (typeof selectedStar === "string") return selectedStar;
    if (
      selectedStar &&
      typeof selectedStar === "object" &&
      "id" in selectedStar &&
      typeof (selectedStar as { id?: unknown }).id === "string"
    ) {
      return (selectedStar as { id: string }).id;
    }
    return null;
  }, [selectedStar]);

  const selectedStarLabel = useMemo<string | null>(() => {
    return resolveSelectedStarLabel(selectedStar, Array.isArray(starPools) ? starPools : []);
  }, [selectedStar, starPools]);

  const starCount = useMemo(() => {
    if (!Array.isArray(starPools)) return 0;
    for (const pool of starPools) {
      if (Array.isArray(pool) && pool.length > 0) return pool.length;
    }
    return 0;
  }, [starPools]);

  useEffect(() => {
    if (!persistSnapshots) return;

    const snapshot = {
      schema: "urai.spatial.persistence.v1" as const,
      savedAt: new Date().toISOString(),
      sceneMode,
      selectedStarId,
      selectedStarLabel,
      presenting,
      hasHeadsetPose,
      xrInput,
      arPlacement,
      locomotion,
      starCount,
      headset: {
        presenting,
        hasHeadsetPose,
        selectedStarId,
        handoffMode,
      },
      metrics: {
        starCount,
      },
    };

    writeSpatialPersistenceSnapshot(snapshot);

    const target = window as PersistenceWindow;
    target.__URAI_SPATIAL_PERSISTENCE__ = snapshot;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-persistence-updated", {
        detail: snapshot,
      }),
    );
  }, [
    persistSnapshots,
    sceneMode,
    selectedStarId,
    selectedStarLabel,
    presenting,
    hasHeadsetPose,
    xrInput,
    arPlacement,
    locomotion,
    starCount,
    handoffMode,
  ]);

  return null;
}
