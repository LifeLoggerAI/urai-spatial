import { STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import type { SpatialRuntimePayload } from "../types";

export function buildUnityRuntimePayload(): SpatialRuntimePayload {
  const state = useSceneStore.getState();

  return {
    schema: "urai.spatial.runtime.v1",
    generatedAt: new Date().toISOString(),
    mode: state.mode,
    selectedStarId: state.selectedStar ?? null,
    selectedObjectId: state.selectedObject ?? null,
    presenting: state.xrState.presenting,
    starCount: STARS.length,
    xrInput: {
      handedness: state.xrState.xrInput.handedness ?? null,
      pointerActive: state.xrState.xrInput.pointerActive ?? false,
      squeezeActive: state.xrState.xrInput.squeezeActive ?? false,
      selectActive: state.xrState.xrInput.selectActive ?? false,
    },
  };
}
