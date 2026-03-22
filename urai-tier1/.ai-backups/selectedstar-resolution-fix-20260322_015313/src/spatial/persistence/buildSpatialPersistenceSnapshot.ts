type SelectedStarLike =
  | string
  | {
      id?: string | null;
      label?: string | null;
      title?: string | null;
    }
  | null
  | undefined;

type PersistenceInput = {
  mode: string;
  selectedStarId: SelectedStarLike;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: any;
  arPlacement: any;
  locomotion: any;
  starCount?: number;
};

function getSelectedStarId(selectedStarId: SelectedStarLike): string | null {
  if (!selectedStarId) return null;
  if (typeof selectedStarId === "string") return selectedStarId;
  return selectedStarId.id ?? null;
}

function getSelectedStarLabel(selectedStarId: SelectedStarLike): string | null {
  if (!selectedStarId || typeof selectedStarId === "string") return null;
  return selectedStarId.label ?? selectedStarId.title ?? null;
}

export function buildSpatialPersistenceSnapshot(input: PersistenceInput) {
  const selectedStarId = getSelectedStarId(input.selectedStarId);
  const selectedStarLabel = getSelectedStarLabel(input.selectedStarId);

  return {
    schema: "urai.spatial.persistence.v1" as const,
    savedAt: new Date().toISOString(),
    sceneMode: input.mode,
    selectedStarId,
    selectedStarLabel,
    presenting: input.presenting,
    hasHeadsetPose: input.hasHeadsetPose,
    xrInput: input.xrInput,
    arPlacement: input.arPlacement,
    locomotion: input.locomotion,
    starCount: input.starCount ?? 0,
    headset: {
      presenting: input.presenting,
      hasHeadsetPose: input.hasHeadsetPose,
    },
    metrics: {
      starCount: input.starCount ?? 0,
      hasSelection: Boolean(selectedStarId),
    },
  };
}
