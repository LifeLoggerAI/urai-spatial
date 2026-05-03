export type SpatialCuratedDeckServiceWindowCheckpoint = {
  id: string;
  label: string;
  window: "backlog" | "active-pass" | "immediate-pass";
  required: boolean;
};

export type SpatialCuratedDeckServiceWindowSummary = {
  schema: "urai.spatial.curated-deck-service-window.v1";
  activeEntryId: string | null;
  totalEntries: number;
  serviceScore: number;
  serviceClass: "cold" | "warm" | "hot";
  deadlineBand: "backlog" | "active-pass" | "immediate-pass";
  responseTarget: "24h" | "4h" | "15m";
  ownerLane: "archive-watch" | "curation-review" | "deep-inspection";
  operatorText: string;
  checkpointCount: number;
  checkpoints: SpatialCuratedDeckServiceWindowCheckpoint[];
  summaryText: string;
};
