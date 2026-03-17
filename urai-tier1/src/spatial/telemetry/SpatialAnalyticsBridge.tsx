"use client";

import { useEffect, useRef } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { useXrSessionStore } from "@/spatial/xr/xrSessionStore";
import { useArPlacementStore } from "@/spatial/xr/arPlacementStore";
import { useXrLocomotionStore } from "@/spatial/xr/xrLocomotionStore";
import { appendSpatialTelemetryEvent } from "@/spatial/telemetry/spatialTelemetryIO";
import { createSpatialTelemetryEvent } from "@/spatial/telemetry/spatialTelemetryTypes";

type TelemetryWindow = Window & {
  __URAI_SPATIAL_TELEMETRY_QUEUE__?: unknown;
};

export default function SpatialAnalyticsBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const presenting = useXrSessionStore((s) => s.presenting);
  const hasHeadsetPose = useXrSessionStore((s) => s.hasHeadsetPose);

  const arVisible = useArPlacementStore((s) => s.pose.visible);
  const arHasPlane = useArPlacementStore((s) => s.pose.hasPlane);

  const locomotionActive = useXrLocomotionStore((s) => s.pose.active);
  const locomotionMode = useXrLocomotionStore((s) => s.pose.mode);

  const prevMode = useRef<string | null>(null);
  const prevSelectedStarId = useRef<string | null>(null);
  const prevPresenting = useRef<boolean | null>(null);
  const prevArVisible = useRef<boolean | null>(null);
  const prevLocomotionActive = useRef<boolean | null>(null);

  const push = (
    name:
      | "scene_mode_changed"
      | "selected_star_changed"
      | "xr_presenting_changed"
      | "ar_plane_visibility_changed"
      | "locomotion_activity_changed",
    payload: Record<string, string | number | boolean | null>,
  ) => {
    const queue = appendSpatialTelemetryEvent(
      createSpatialTelemetryEvent({ name, payload }),
    );
    const target = window as TelemetryWindow;
    target.__URAI_SPATIAL_TELEMETRY_QUEUE__ = queue;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-telemetry", {
        detail: queue,
      }),
    );
  };

  useEffect(() => {
    if (prevMode.current === null) {
      prevMode.current = mode;
      return;
    }
    if (prevMode.current === mode) return;
    push("scene_mode_changed", {
      previousMode: prevMode.current,
      nextMode: mode,
    });
    prevMode.current = mode;
  }, [mode]);

  useEffect(() => {
    const starId = selectedStar?.id ?? null;
    if (prevSelectedStarId.current === null && starId === null) return;
    if (prevSelectedStarId.current === starId) return;
    push("selected_star_changed", {
      previousStarId: prevSelectedStarId.current,
      nextStarId: starId,
      nextStarLabel:
        (selectedStar as { label?: string; title?: string } | null)?.label ??
        (selectedStar as { label?: string; title?: string } | null)?.title ??
        null,
    });
    prevSelectedStarId.current = starId;
  }, [selectedStar]);

  useEffect(() => {
    if (prevPresenting.current === null) {
      prevPresenting.current = presenting;
      return;
    }
    if (prevPresenting.current === presenting) return;
    push("xr_presenting_changed", {
      presenting,
      hasHeadsetPose,
    });
    prevPresenting.current = presenting;
  }, [presenting, hasHeadsetPose]);

  useEffect(() => {
    if (prevArVisible.current === null) {
      prevArVisible.current = arVisible;
      return;
    }
    if (prevArVisible.current === arVisible) return;
    push("ar_plane_visibility_changed", {
      visible: arVisible,
      hasPlane: arHasPlane,
    });
    prevArVisible.current = arVisible;
  }, [arVisible, arHasPlane]);

  useEffect(() => {
    if (prevLocomotionActive.current === null) {
      prevLocomotionActive.current = locomotionActive;
      return;
    }
    if (prevLocomotionActive.current === locomotionActive) return;
    push("locomotion_activity_changed", {
      active: locomotionActive,
      mode: locomotionMode,
    });
    prevLocomotionActive.current = locomotionActive;
  }, [locomotionActive, locomotionMode]);

  return null;
}
