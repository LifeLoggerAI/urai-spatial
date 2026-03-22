import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import { resolveStarById } from "../data/stars";
import type { SceneMode, UnityRuntimePayload, XrState } from "../types";

export function buildUnityRuntimePayload(
  mode: SceneMode,
  selectedStarId: string | null,
  xrState: XrState
): UnityRuntimePayload {
  const star = resolveStarById(selectedStarId);

  return {
    schema: "urai.spatial.unity.v1",
    sentAt: new Date().toISOString(),
    sceneMode: mode,
    selectedStarId: selectedStarId ?? null,
    selectedStarLabel: star?.label ?? null,
    presenting: xrState.presenting,
    hasHeadsetPose: xrState.hasHeadsetPose,
    xrInput: xrState.xrInput
  };
}

export default buildUnityRuntimePayload;
