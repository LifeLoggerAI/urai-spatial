export type SpatialCuratedDeckQueueReason = {
  id: string;
  label: string;
  weight: number;
  active: boolean;
};

export type SpatialCuratedDeckQueueSummary = {
  schema: "urai.spatial.curated-deck-queue.v1";
  activeEntryId: string | null;
  totalEntries: number;
  queueScore: number;
  queueLane: "background" | "priority" | "frontline";
  queueOwner: "archive-watch" | "curation-review" | "deep-inspection";
  queuePosition: number;
  processingWindow: "later" | "soon" | "now";
  handoffText: string;
  activeReasonCount: number;
  reasons: SpatialCuratedDeckQueueReason[];
  summaryText: string;
};
