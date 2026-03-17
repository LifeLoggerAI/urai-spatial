import type { SelectedStar } from "@/spatial/state/sceneStore";

export type HeadsetCameraSyncState = {
  presenting: boolean;
  hasHeadsetPose: boolean;
  selectedStarId: string | null;
  handoffMode: "idle" | "selection-focus" | "replay-lock";
};

export function deriveHeadsetCameraSyncState(input: {
  presenting: boolean;
  hasHeadsetPose: boolean;
  selectedStar: SelectedStar | null;
  mode: string;
}): HeadsetCameraSyncState {
  const selectedStarId = input.selectedStar?.id ?? null;

  let handoffMode: HeadsetCameraSyncState["handoffMode"] = "idle";
  if (selectedStarId) handoffMode = "selection-focus";
  if (input.mode === "replay") handoffMode = "replay-lock";

  return {
    presenting: input.presenting,
    hasHeadsetPose: input.hasHeadsetPose,
    selectedStarId,
    handoffMode,
  };
}
