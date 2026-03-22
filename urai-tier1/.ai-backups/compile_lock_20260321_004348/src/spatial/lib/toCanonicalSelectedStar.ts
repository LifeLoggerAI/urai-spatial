import type { SpatialStar } from "../data/stars";
import type { SelectedStar } from "../state/selectedStarContract";

export function toCanonicalSelectedStar(star: SpatialStar): SelectedStar {
  return {
    ...star,
    id: star.id,
    position: star.position,
    color: star.color,
    size: star.size,
    order: star.order,
    era: star.era,
    kind: star.kind,
    glow: star.glow,
    intensity: star.intensity,
    title: star.title,
    label: star.label,
    signature: star.signature,
    chapter: star.chapter,
    timeband: star.timeband,
    description: star.description,
  };
}
