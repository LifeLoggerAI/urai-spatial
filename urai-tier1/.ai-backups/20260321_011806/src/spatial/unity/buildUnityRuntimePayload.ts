import { STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import type { SpatialRuntimePayload, UnityRuntimePayloadInput } from "../types";

export type { UnityRuntimePayloadInput };

export function buildUnityRuntimePayload(input?: UnityRuntimePayloadInput): SpatialRuntimePayload {
  const state = useSceneStore.getState();

  return {
    schema: "urai.spatial.runtime.v1",
    mode: input?.mode ?? state.mode,
    phase: input?.phase ?? state.phase,
    selectedStarId: input?.selectedStarId ?? state.selectedStar,
    selectedObjectId: input?.selectedObjectId ?? state.selectedObject,
    presenting: input?.presenting ?? state.xrState?.presenting ?? false,
    xrInput: {
      handedness: input?.xrInput?.handedness ?? state.xrState?.xrInput?.handedness ?? null,
      pointerActive: input?.xrInput?.pointerActive ?? state.xrState?.xrInput?.pointerActive ?? false,
      squeezeActive: input?.xrInput?.squeezeActive ?? state.xrState?.xrInput?.squeezeActive ?? false,
      selectActive: input?.xrInput?.selectActive ?? state.xrState?.xrInput?.selectActive ?? false,
    },
    starCount: input?.starCount ?? STARS.length,
  };
}
