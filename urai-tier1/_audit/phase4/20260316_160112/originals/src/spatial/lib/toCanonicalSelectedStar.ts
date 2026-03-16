import { SpatialStar } from "../data/stars";
import { SelectedStar } from "../state/sceneStore";

export function toCanonicalSelectedStar(star: SpatialStar): SelectedStar {
  return {
    id: star.id,
    position: star.position,
    color: star.color,
    size: star.size,
    title: star.title,
    label: star.label,
    signature: star.signature,
    chapter: star.chapter,
    timeband: star.timeband,
    description: star.description,
  };
}
