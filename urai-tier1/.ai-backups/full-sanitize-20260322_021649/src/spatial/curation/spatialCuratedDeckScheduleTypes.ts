export type SpatialCuratedDeckScheduleCheckpoint = {
  id: string;
  label: string;
  timing: "later" | "soon" | "now";
  required: boolean;
};

export type SpatialCuratedDeckScheduleSummary = {
  schema: "urai.spatial.curated-deck-schedule.v1";
  activeEntryId: string | null;
  totalEntries: number;
  scheduleScore: number;
  cadence: "deferred" | "planned" | "immediate";
  etaWindow: "backlog" | "this-pass" | "now";
  reviewCycle: "weekly" | "daily" | "live";
  operatorText: string;
  checkpointCount: number;
  checkpoints: SpatialCuratedDeckScheduleCheckpoint[];
  summaryText: string;
};
