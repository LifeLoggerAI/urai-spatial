
export type SpatialCuratedDeckChangeLedgerRow = {
  id: string;
  baseEntryId: string;
  targetEntryId: string;
  label: string;
  summaryText: string;
  cardCountDelta: number;
  sceneModeShiftCount: number;
  selectedStarShiftCount: number;
  sameAccount: boolean;
  sourceChanged: boolean;
  firstCardChanged: boolean;
};

export type SpatialCuratedDeckChangeLedger = {
  schema: "urai.spatial.curated-deck-change-ledger.v1";
  rowCount: number;
  rows: SpatialCuratedDeckChangeLedgerRow[];
};
