
import type { SceneMode } from "../state/sceneStore";

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
  sceneMode: SceneMode;
  starId: string | null;
};

export function resolveARPlacementStateById(
  selectedStar: SpatialStarLike,
  mode: SceneMode
): ARPlacementState | null {
  if (mode === "home") return null;

  const starId = selectedStar?.id ?? null;
  const starLabel =
    selectedStar?.label ??
    selectedStar?.title ??
    selectedStar?.name ??
    (starId ? `Star ${starId}` : null);

  if (mode === "replay") {
    return {
      label: starLabel ? `Replay Ready · ${starLabel}` : "Replay Ready",
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  if (mode === "focus") {
    return {
      label: starLabel ? `Focus Locked · ${starLabel}` : "Focus Locked",
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  if (mode === "lifemap") {
    return {
      label: starLabel ? `AR Placement Ready · ${starLabel}` : "AR Placement Ready",
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  if (mode === "ascent") {
    return {
      label: "Sky Anchor Ready",
      active: true,
      sceneMode: mode,
      starId,
    };
  }

  return null;
}
