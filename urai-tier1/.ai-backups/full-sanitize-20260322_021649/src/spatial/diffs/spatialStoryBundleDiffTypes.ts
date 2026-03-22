export type SpatialStoryBundleDiff = {
  schema: "urai.spatial.story-bundle-diff.v1";
  baseEntryId: string;
  targetEntryId: string;
  sameAccount: boolean;
  sceneModeChanged: boolean;
  selectedStarChanged: boolean;
  lensChanged: boolean;
  narratorChanged: boolean;
  arcCountDelta: number;
  seasonalArcCountDelta: number;
  locomotionDistanceDelta: number;
  summaryText: string;
};
