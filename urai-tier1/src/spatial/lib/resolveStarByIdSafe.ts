import { SPATIAL_STARS } from "@/spatial/data/stars";

export function resolveStarByIdSafe(id: string | null | undefined) {
  if (!id) return null;
  return SPATIAL_STARS.find((star) => star.id === id) ?? null;
}
