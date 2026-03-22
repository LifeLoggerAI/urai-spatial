export type SpatialCuratedDeckDiff = {
  schema: "urai.spatial.curated-deck-diff.v1";
  baseEntryId: string;
  targetEntryId: string;
  sameAccount: boolean;
  cardCountDelta: number;
  sourceChanged: boolean;
  firstCardChanged: boolean;
  sceneModeShiftCount: number;
  selectedStarShiftCount: number;
  summaryText: string;
};
