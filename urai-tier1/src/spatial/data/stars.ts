export const SPATIAL_STARS: Array<{ id: string; label?: string }> = [];

export function resolveStarById(id: string | null | undefined) {
  if (!id) return null;
  return SPATIAL_STARS.find((star) => star.id === id) ?? null;
}
