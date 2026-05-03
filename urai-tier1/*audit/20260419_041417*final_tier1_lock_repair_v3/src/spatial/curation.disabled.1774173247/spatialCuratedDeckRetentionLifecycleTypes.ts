export type SpatialCuratedDeckRetentionLifecycleSignal = {
  id: string;
  label: string;
  weight: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckRetentionLifecycleSummary = {
  schema: "urai.spatial.curated-deck-retention-lifecycle.v1";
  activeEntryId: string | null;
  totalEntries: number;
  retentionScore: number;
  retentionState: "hot-hold" | "watch-retained" | "cold-archived";
  reviewCadence: "daily" | "weekly" | "monthly";
  retentionPath: "keep-live" | "guarded-retention" | "archive-cold";
  operatorText: string;
  activeSignalCount: number;
  signals: SpatialCuratedDeckRetentionLifecycleSignal[];
  summaryText: string;
};
