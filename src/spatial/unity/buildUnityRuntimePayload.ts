import { resolveStarById } from "../data/stars";
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
    xrInput: xrState.xrInput
  };
}

export default buildUnityRuntimePayload;
