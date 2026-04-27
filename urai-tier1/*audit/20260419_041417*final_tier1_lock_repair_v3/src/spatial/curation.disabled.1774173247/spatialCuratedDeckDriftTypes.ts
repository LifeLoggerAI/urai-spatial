
export type SpatialCuratedDeckDriftStep = {
  id: string;
  fromEntryId: string;
  toEntryId: string;
  label: string;
  cardCountDelta: number;
  sceneModeShiftCount: number;
  selectedStarShiftCount: number;
  sourceChanged: boolean;
  firstCardChanged: boolean;
  sameAccount: boolean;
};

export type SpatialCuratedDeckDriftSummary = {
  schema: "urai.spatial.curated-deck-drift.v1";
  activeEntryId: string | null;
  accountId: string | null;
  source: string | null;
  windowSize: number;
  stepCount: number;
  driftScore: number;
  driftBand: "calm" | "shifting" | "drifting";
  sourceChangedCount: number;
  firstCardChangedCount: number;
  sceneModeShiftTotal: number;
  selectedStarShiftTotal: number;
  cardDeltaMagnitude: number;
  summaryText: string;
  steps: SpatialCuratedDeckDriftStep[];
};
