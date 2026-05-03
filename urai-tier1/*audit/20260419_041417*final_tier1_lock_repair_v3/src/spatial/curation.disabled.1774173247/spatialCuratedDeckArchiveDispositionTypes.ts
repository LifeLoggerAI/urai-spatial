export type SpatialCuratedDeckArchiveDispositionSignal = {
  id: string;
  label: string;
  level: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckArchiveDispositionSummary = {
  schema: "urai.spatial.curated-deck-archive-disposition.v1";
  activeEntryId: string | null;
  totalEntries: number;
  dispositionScore: number;
  disposition: "hold" | "requeue" | "archive";
  retentionLane: "active-watch" | "review-hold" | "archive-ready";
  reopenRisk: "low" | "medium" | "high";
  operatorText: string;
  activeSignalCount: number;
  signals: SpatialCuratedDeckArchiveDispositionSignal[];
  summaryText: string;
};
