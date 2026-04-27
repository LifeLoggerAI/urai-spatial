export type SpatialCuratedDeckSlaSignal = {
  id: string;
  label: string;
  impact: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckSlaSummary = {
  schema: "urai.spatial.curated-deck-sla.v1";
  activeEntryId: string | null;
  totalEntries: number;
  slaScore: number;
  serviceTier: "standard" | "priority" | "critical";
  breachRisk: "clear" | "watch" | "at-risk";
  responseTarget: "24h" | "4h" | "15m";
  nextCheckpointWindow: "backlog" | "active-pass" | "immediate-pass";
  operatorText: string;
  activeSignalCount: number;
  signals: SpatialCuratedDeckSlaSignal[];
  summaryText: string;
};
