"use client";

import { useEffect, useRef } from "react";
import { useSceneStore } from "../state/sceneStore";

type AnalyticsPayload = Record<string, unknown>;

type AnalyticsWindow = Window & {
  __URAI_SPATIAL_ANALYTICS__?: Array<{
    event: string;
    payload: AnalyticsPayload;
    at: string;
  }>;
};

function push(event: string, payload: AnalyticsPayload): void {
  if (typeof window === "undefined") return;
  const target = window as AnalyticsWindow;
  if (!Array.isArray(target.__URAI_SPATIAL_ANALYTICS__)) {
    target.__URAI_SPATIAL_ANALYTICS__ = [];
  }
  target.__URAI_SPATIAL_ANALYTICS__.push({
    event,
    payload,
    at: new Date().toISOString(),
  });
}

function getSelectedStarId(selectedStar: unknown): string | null {
  if (typeof selectedStar === "string" && selectedStar.trim().length > 0) {
    return selectedStar;
  }

  if (
    selectedStar &&
    typeof selectedStar === "object" &&
    "id" in selectedStar &&
    typeof (selectedStar as { id?: unknown }).id === "string" &&
    ((selectedStar as { id: string }).id || "").trim().length > 0
  ) {
    return (selectedStar as { id: string }).id;
  }

  return null;
}

export default function SpatialAnalyticsBridge() {
  const mode = useSceneStore((s: any) => s.mode);
  const selectedStar = useSceneStore((s: any) => s.selectedStar ?? null);
  const hoveredStar = useSceneStore((s: any) => s.hoveredStar ?? null);

  const prevMode = useRef<string | null>(null);
  const prevSelectedStarId = useRef<string | null>(null);
  const prevHoveredStarId = useRef<string | null>(null);

  useEffect(() => {
    const currentMode = typeof mode === "string" ? mode : null;
    if (prevMode.current === currentMode) return;

    push("scene_mode_changed", {
      from: prevMode.current,
      to: currentMode,
    });

    prevMode.current = currentMode;
  }, [mode]);

  useEffect(() => {
    const starId = getSelectedStarId(selectedStar);
    if (prevSelectedStarId.current === null && starId === null) return;
    if (prevSelectedStarId.current === starId) return;

    push("selected_star_changed", {
      from: prevSelectedStarId.current,
      to: starId,
    });

    prevSelectedStarId.current = starId;
  }, [selectedStar]);

  useEffect(() => {
    const starId = getSelectedStarId(hoveredStar);
    if (prevHoveredStarId.current === null && starId === null) return;
    if (prevHoveredStarId.current === starId) return;

    push("hovered_star_changed", {
      from: prevHoveredStarId.current,
      to: starId,
    });

    prevHoveredStarId.current = starId;
  }, [hoveredStar]);

  return null;
}
