import type { SelectedStar } from "@/spatial/state/selectedStarContract";
import { toCanonicalSelectedStar } from "@/spatial/state/toCanonicalSelectedStar";

export type HeadsetCameraSyncState = {
  selectedStarId: string | null;
  active: boolean;
};

export function createHeadsetCameraSyncState(selectedStar: SelectedStar): HeadsetCameraSyncState {
  const canonical = toCanonicalSelectedStar(selectedStar);
  return {
    selectedStarId: canonical.id,
    active: Boolean(canonical.id),
  };
}
