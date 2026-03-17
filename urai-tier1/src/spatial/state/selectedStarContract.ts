import type { SpatialStar } from "../data/stars";

export type SelectedStar = SpatialStar & {
  [key: string]: any;
};

export type SelectedStarNormalized = SelectedStar;

export function normalizeSelectedStar(
  selectedStar: SelectedStar | null
): SelectedStarNormalized | null {
  if (!selectedStar) return null;
  return { ...selectedStar };
}
