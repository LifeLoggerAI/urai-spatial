import { buildUnityRuntimePayload } from "@/spatial/unity/buildUnityRuntimePayload";
import { createEmptyArPlacementPose } from "@/spatial/xr/arPlacementTypes";
import { createEmptyXrInputSnapshot } from "@/spatial/xr/xrInputTypes";
import { createEmptyXrLocomotionState } from "@/spatial/xr/xrLocomotionTypes";

export const UNITY_RUNTIME_PAYLOAD_SAMPLE = buildUnityRuntimePayload({
  mode: "lifemap",
  selectedStar: null,
  presenting: false,
  hasHeadsetPose: false,
  xrInput: createEmptyXrInputSnapshot(),
  arPlacement: createEmptyArPlacementPose(),
  locomotion: createEmptyXrLocomotionState(),
  starCount: 42,
});
