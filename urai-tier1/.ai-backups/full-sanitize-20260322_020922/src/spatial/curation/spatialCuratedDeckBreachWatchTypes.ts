export type SpatialCuratedDeckBreachWatchTrigger = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckBreachWatchMitigation = {
  id: string;
  label: string;
  urgency: "later" | "soon" | "now";
  required: boolean;
};

export type SpatialCuratedDeckBreachWatchSummary = {
  schema: "urai.spatial.curated-deck-breach-watch.v1";
  activeEntryId: string | null;
  totalEntries: number;
  breachWatchScore: number;
  watchBand: "clear" | "watch" | "breach-risk";
  breachLikelihood: "low" | "elevated" | "high";
  operatorText: string;
  activeTriggerCount: number;
  requiredMitigationCount: number;
  triggers: SpatialCuratedDeckBreachWatchTrigger[];
  mitigations: SpatialCuratedDeckBreachWatchMitigation[];
  summaryText: string;
};
