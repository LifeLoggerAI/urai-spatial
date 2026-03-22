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
  selectedStar: SelectedStarLike;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: any;
  arPlacement: any;
  locomotion: any;
  starCount?: number;
};

function getSelectedStarId(selectedStar: SelectedStarLike): string | null {
  if (!selectedStar) return null;
  if (typeof selectedStar === "string") return selectedStar;
  return selectedStar.id ?? null;
}

function getSelectedStarLabel(selectedStar: SelectedStarLike): string | null {
  if (!selectedStar || typeof selectedStar === "string") return null;
  return selectedStar.label ?? selectedStar.title ?? null;
}

export function buildSpatialPersistenceSnapshot(input: PersistenceInput) {
  const selectedStarId = getSelectedStarId(input.selectedStar);
  const selectedStarLabel = getSelectedStarLabel(input.selectedStar);

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
