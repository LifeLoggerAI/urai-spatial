export type SpatialCuratedDeckDispatchTask = {
  id: string;
  label: string;
  lane: "observe" | "review" | "inspect";
  required: boolean;
};

export type SpatialCuratedDeckDispatchSummary = {
  schema: "urai.spatial.curated-deck-dispatch.v1";
  activeEntryId: string | null;
  totalEntries: number;
  dispatchScore: number;
  dispatchLane: "observe" | "review" | "inspect";
  dispatchOwner: "archive-watch" | "curation-review" | "deep-inspection";
  handoffText: string;
  requiredTaskCount: number;
  tasks: SpatialCuratedDeckDispatchTask[];
  summaryText: string;
};
