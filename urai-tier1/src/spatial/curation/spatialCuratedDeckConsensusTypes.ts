export type SpatialCuratedDeckConsensusSummary = {
  schema: "urai.spatial.curated-deck-consensus.v1";
  activeEntryId: string | null;
  totalEntries: number;
  cohortSize: number;
  dominantSource: string | null;
  activeMatchesDominantSource: boolean;
  averageCardCount: number;
  cardCountDeltaFromAverage: number;
  commonFirstCardEntryId: string | null;
  activeMatchesCommonFirstCard: boolean;
  dominantFirstSceneMode: string | null;
  activeMatchesDominantFirstSceneMode: boolean;
  summaryText: string;
};
