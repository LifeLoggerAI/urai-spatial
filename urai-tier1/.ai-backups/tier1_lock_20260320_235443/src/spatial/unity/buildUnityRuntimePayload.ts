import type { SceneMode } from "../state/sceneStore";

type SelectedStar =
  | string
  | {
      id?: string | null;
      starId?: string | null;
      key?: string | null;
      label?: string | null;
      title?: string | null;
      name?: string | null;
    }
  | null;

export type UnityRuntimePayloadInput = {
  mode: SceneMode | string;
  selectedStar: SelectedStar;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: Record<string, unknown>;
  arPlacement: Record<string, unknown>;
  locomotion: Record<string, unknown>;
  starCount?: number;
};

function normalizeSelectedStarId(selectedStar: SelectedStar): string | null {
  if (!selectedStar) return null;
  if (typeof selectedStar === "string") return selectedStar;
  return selectedStar.id ?? selectedStar.starId ?? selectedStar.key ?? null;
}

function normalizeSelectedStarLabel(selectedStar: SelectedStar): string | null {
  if (!selectedStar || typeof selectedStar === "string") return null;
  return selectedStar.label ?? selectedStar.title ?? selectedStar.name ?? null;
}

export function buildUnityRuntimePayload(input: UnityRuntimePayloadInput) {
  const selectedStarId = normalizeSelectedStarId(input.selectedStar);
  const selectedStarLabel = normalizeSelectedStarLabel(input.selectedStar);

  return {
    schema: "urai.unity.runtime.v1" as const,
    sceneMode: input.mode,
    replayActive: input.mode === "replay",
    selectedStarId,
    selectedStarLabel,
    presenting: input.presenting,
    hasHeadsetPose: input.hasHeadsetPose,
    xrInput: input.xrInput,
    arPlacement: input.arPlacement,
    locomotion: input.locomotion,
    starCount: input.starCount ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

export default buildUnityRuntimePayload;
