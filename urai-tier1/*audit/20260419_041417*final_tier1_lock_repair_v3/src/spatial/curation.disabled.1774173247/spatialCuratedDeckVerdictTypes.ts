export type SpatialCuratedDeckVerdictReason = {
  id: string;
  label: string;
  weight: number;
  active: boolean;
};

export type SpatialCuratedDeckVerdictSummary = {
  schema: "urai.spatial.curated-deck-verdict.v1";
  activeEntryId: string | null;
  totalEntries: number;
  verdictScore: number;
  verdictBand: "nominal" | "monitor" | "investigate";
  primaryReason: string;
  activeReasonCount: number;
  reasons: SpatialCuratedDeckVerdictReason[];
  summaryText: string;
};
