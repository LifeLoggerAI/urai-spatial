import { buildUnityRuntimePayload } from "./buildUnityRuntimePayload";

export const UNITY_RUNTIME_PAYLOAD_SAMPLE = buildUnityRuntimePayload({
  mode: "lifemap",
  phase: "lifemap",
  selectedStarId: "star-1",
  selectedObjectId: null,
  presenting: false,
  xrInput: {
    handedness: null,
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
  starCount: 42,
});
