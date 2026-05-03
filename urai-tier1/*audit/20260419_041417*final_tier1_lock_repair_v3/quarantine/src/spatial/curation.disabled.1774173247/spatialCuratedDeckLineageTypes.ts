export type SpatialCuratedDeckLineageNode = {
  id: string;
  label: string;
  source: string;
  accountId: string;
  cardCount: number;
  position: "previous" | "active" | "next";
  isActive: boolean;
};

export type SpatialCuratedDeckLineage = {
  schema: "urai.spatial.curated-deck-lineage.v1";
  totalEntries: number;
  activeIndex: number;
  previousEntryId: string | null;
  activeEntryId: string | null;
  nextEntryId: string | null;
  summaryText: string;
  nodes: SpatialCuratedDeckLineageNode[];
};
