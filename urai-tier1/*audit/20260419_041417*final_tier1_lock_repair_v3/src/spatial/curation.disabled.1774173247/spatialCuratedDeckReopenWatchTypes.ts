export type SpatialCuratedDeckReopenWatchTrigger = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckReopenWatchSummary = {
  schema: "urai.spatial.curated-deck-reopen-watch.v1";
  activeEntryId: string | null;
  totalEntries: number;
  reopenScore: number;
  reopenState: "dormant" | "guarded" | "reopen-risk";
  watchMode: "passive" | "guarded" | "active";
  reentryPath: "stay-archived" | "review-return" | "reopen-immediately";
  operatorText: string;
  activeTriggerCount: number;
  triggers: SpatialCuratedDeckReopenWatchTrigger[];
  summaryText: string;
};
