export type SpatialCuratedDeckRetentionHorizonCheckpoint = {
  id: string;
  label: string;
  horizon: "near" | "mid" | "far";
  required: boolean;
};

export type SpatialCuratedDeckRetentionHorizonSummary = {
  schema: "urai.spatial.curated-deck-retention-horizon.v1";
  activeEntryId: string | null;
  totalEntries: number;
  horizonScore: number;
  storageHorizon: "hot" | "warm" | "cold";
  expiryBand: "7d" | "30d" | "90d";
  retentionWindow: "short" | "medium" | "long";
  operatorText: string;
  checkpointCount: number;
  checkpoints: SpatialCuratedDeckRetentionHorizonCheckpoint[];
  summaryText: string;
};
