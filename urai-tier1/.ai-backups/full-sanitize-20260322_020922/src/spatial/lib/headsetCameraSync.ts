import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SelectedStar } from "@/spatial/state/selectedStarContract";
import { toCanonicalSelectedStar } from "@/spatial/state/toCanonicalSelectedStar";

export type HeadsetCameraSyncState = {
  selectedStarId: string | null;
  active: boolean;
};

export function createHeadsetCameraSyncState(selectedStarId: SelectedStar): HeadsetCameraSyncState {
  const canonical = toCanonicalSelectedStar(selectedStarId);
  return {
    selectedStarId: canonical.id,
    active: Boolean(canonical.id),
  };
}
