export type SpatialCuratedDeckActionItem = {
  id: string;
  label: string;
  priority: "low" | "medium" | "high";
  active: boolean;
};

export type SpatialCuratedDeckActionSummary = {
  schema: "urai.spatial.curated-deck-action.v1";
  activeEntryId: string | null;
  totalEntries: number;
  actionScore: number;
  recommendedAction: "ignore" | "watch" | "inspect";
  operatorText: string;
  activeItemCount: number;
  items: SpatialCuratedDeckActionItem[];
  summaryText: string;
};
