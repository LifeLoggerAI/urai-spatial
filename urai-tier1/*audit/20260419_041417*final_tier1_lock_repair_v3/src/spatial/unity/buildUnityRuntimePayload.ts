
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import { resolveStarById } from "@/spatial/data/stars";
import type { Mode, UnityRuntimePayload, XrState } from "../types";

export function buildUnityRuntimePayload(
  mode: Mode,
  selectedStarId: string | null,
  xrState: XrState
): UnityRuntimePayload {
  const star = resolveStarById(selectedStarId);

  return {
    schema: "urai.spatial.unity.v1",
    sentAt: new Date().toISOString(),
    sceneMode: mode,
    selectedStarId: selectedStarId ?? null,
    selectedStarLabel: (star && ("label" in star ? star.label : star.name)) ?? null,
    presenting: xrState.presenting,
    hasHeadsetPose: xrState.hasHeadsetPose,
    xrInput: xrState.xrInput
  };
}

export default buildUnityRuntimePayload;
