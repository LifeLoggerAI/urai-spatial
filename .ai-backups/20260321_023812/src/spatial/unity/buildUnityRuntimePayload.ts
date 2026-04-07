"use client";

import { resolveStarById, SPATIAL_STARS } from "../data/stars";
import type { SceneMode, UnityRuntimePayload, XrState } from "../types";

export function buildUnityRuntimePayload(
  mode: SceneMode,
  selectedStar: string | null,
  xrState: XrState
): UnityRuntimePayload {
  const star = resolveStarById(selectedStar);
  return {
    schema: "urai.spatial.unity.v1",
    sentAt: new Date().toISOString(),
    sceneMode: mode,
    selectedStarId: selectedStar ?? null,
    selectedStarLabel: star?.label ?? null,
    presenting: xrState.presenting,
    hasHeadsetPose: xrState.hasHeadsetPose,
    xrInput: {
      handedness: xrState.xrInput.handedness ?? null,
      pointerActive: xrState.xrInput.pointerActive ?? false,
      squeezeActive: xrState.xrInput.squeezeActive ?? false,
      selectActive: xrState.xrInput.selectActive ?? false,
    },
    arPlacement: { active: false, anchored: false },
    locomotion: { mode: "static", speed: 0 },
    starCount: SPATIAL_STARS.length,
    headset: { supported: false, connected: xrState.presenting },
    metrics: { fpsHint: 60, quality: "high" },
  };
}

export default buildUnityRuntimePayload;
