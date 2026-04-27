
import type { Mode } from "@/lib/uraiCanon/types";

type SpatialStarLike =
  | {
      id?: string;
      label?: string | null;
      title?: string | null;
      name?: string | null;
    }
  | null
  | undefined;

export type ARPlacementState = {
  label: string;
  active: boolean;
  sceneMode: Mode;
  starId: string | null;
};

export function resolveARPlacementStateById(
  selectedStar: SpatialStarLike,
  mode: Mode
): ARPlacementState | null {
  if (mode === "HOME") return null;

  const starId = selectedStar?.id ?? null;
  const starLabel =
    selectedStar?.label ??
    selectedStar?.title ??
    selectedStar?.name ??

  if (mode === "REPLAY") {
    return {
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  if (mode === "FOCUS") {
    return {
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  if (mode === "LIFEMAP") {
    return {
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  if (mode === "ASCENT") {
    return {
      label: "Sky Anchor Ready",
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  return null;
}
