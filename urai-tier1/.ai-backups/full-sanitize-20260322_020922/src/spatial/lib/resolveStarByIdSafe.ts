import { SPATIAL_STARS } from "../data/stars";

export function resolveStarByIdSafe(id: string | null | undefined) {
  if (!id) return null;
  return SPATIAL_STARS.find((s) => s.id === id) ?? null;
}
