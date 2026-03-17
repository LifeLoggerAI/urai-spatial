import type { SelectedStar } from "@/spatial/state/selectedStarContract";
import type { ArPlacementPose } from "@/spatial/xr/arPlacementTypes";
import type { XrInputSnapshot } from "@/spatial/xr/xrInputTypes";
import type { XrLocomotionState } from "@/spatial/xr/xrLocomotionTypes";
import { deriveHeadsetCameraSyncState } from "@/spatial/lib/headsetCameraSync";
import {
  createEmptySpatialPersistenceSnapshot,
  type SpatialPersistenceSnapshot,
} from "@/spatial/persistence/spatialPersistenceTypes";

export function buildSpatialPersistenceSnapshot(input: {
  mode: string;
  selectedStar: SelectedStar | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
  arPlacement: ArPlacementPose;
  locomotion: XrLocomotionState;
  starCount?: number;
}): SpatialPersistenceSnapshot {
  const headset = deriveHeadsetCameraSyncState({
    presenting: input.presenting,
    hasHeadsetPose: input.hasHeadsetPose,
    selectedStar: input.selectedStar,
    mode: input.mode,
  });

  const base = createEmptySpatialPersistenceSnapshot();

  return {
    ...base,
    savedAt: new Date().toISOString(),
    sceneMode: input.mode,
    selectedStarId: input.selectedStar?.id ?? null,
    selectedStarLabel:
      (input.selectedStar as { label?: string; title?: string } | null)?.label ??
      (input.selectedStar as { label?: string; title?: string } | null)?.title ??
      null,
    headset,
    xrInput: input.xrInput,
    arPlacement: input.arPlacement,
    locomotion: input.locomotion,
    metrics: {
      starCount: input.starCount ?? 0,
    },
  };
}
