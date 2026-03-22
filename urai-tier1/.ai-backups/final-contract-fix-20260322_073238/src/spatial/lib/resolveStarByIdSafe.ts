import { SPATIAL_STARS, type SpatialStar } from "@/spatial/data/stars";

export function resolveStarByIdSafe(starOrId: string | SpatialStar | null | undefined): SpatialStar | null {
  if (!starOrId) return null;
  if (typeof starOrId === "object" && "id" in starOrId && typeof starOrId.id === "string") {
    return starOrId as SpatialStar;
  }
  if (typeof starOrId !== "string" || !starOrId.trim()) return null;
  return SPATIAL_STARS.find((star) => star.id === starOrId) ?? null;
}
