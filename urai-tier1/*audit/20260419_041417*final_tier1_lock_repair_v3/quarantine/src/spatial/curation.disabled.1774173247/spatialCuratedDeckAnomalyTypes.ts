export type SpatialCuratedDeckAnomalyFlag = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckAnomalySummary = {
  schema: "urai.spatial.curated-deck-anomaly.v1";
  activeEntryId: string | null;
  totalEntries: number;
  anomalyScore: number;
  anomalyBand: "clear" | "watch" | "anomalous";
  flagCount: number;
  flags: SpatialCuratedDeckAnomalyFlag[];
  summaryText: string;
};
