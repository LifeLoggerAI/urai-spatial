import type { CanonicalSelectedStar } from "./selectedStarContract";
import { getSelectedStarId } from "./selectedStarContract";

export function toCanonicalSelectedStar(value: CanonicalSelectedStar): string | null {
  return getSelectedStarId(value);
}
