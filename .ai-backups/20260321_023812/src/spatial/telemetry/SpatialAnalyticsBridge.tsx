"use client";

import { useEffect, useRef } from "react";
import { resolveStarById, SPATIAL_STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import { useXrStore } from "../unity/UnityRuntimePayloadBridge";
import type { SpatialAnalyticsPoint, SpatialPersistenceSnapshot } from "../types";

const analyticsBuffer: SpatialAnalyticsPoint[] = [];

export function appendRollbackPoint(point: SpatialAnalyticsPoint) {
  analyticsBuffer.push(point);
  if (analyticsBuffer.length > 100) analyticsBuffer.shift();
  if (typeof window !== "undefined") {
    (window as Window & { __URAI_SPATIAL_ANALYTICS__?: SpatialAnalyticsPoint[] }).__URAI_SPATIAL_ANALYTICS__ = [...analyticsBuffer];
  }
}

export function SpatialAnalyticsBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const xrState = useXrStore();
  const lastKeyRef = useRef<string>("");

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

    const point: SpatialAnalyticsPoint = {
      at: new Date().toISOString(),
      channel: "spatial",
      sceneMode: mode,
      selectedStarId: selectedStar ?? null,
      snapshot,
    };

    const dedupeKey = `${point.sceneMode}:${point.selectedStarId ?? "null"}`;
    if (lastKeyRef.current === dedupeKey) return;
    lastKeyRef.current = dedupeKey;

    appendRollbackPoint(point);
    window.dispatchEvent(new CustomEvent("urai:spatial-analytics", { detail: point }));
  }, [mode, selectedStar, xrState]);

  return null;
}

export default SpatialAnalyticsBridge;
