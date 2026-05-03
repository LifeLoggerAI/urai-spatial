export type SpatialCuratedDeckCohortSibling = {
  id: string;
  label: string;
  source: string;
  accountId: string;
  cardCount: number;
  relation: "previous-same-account" | "next-same-account" | "recent-same-source";
};

export type SpatialCuratedDeckCohort = {
  schema: "urai.spatial.curated-deck-cohort.v1";
  activeEntryId: string | null;
  totalEntries: number;
  sameAccountCount: number;
  sameSourceCount: number;
  sameAccountAndSourceCount: number;
  previousSameAccountEntryId: string | null;
  nextSameAccountEntryId: string | null;
  summaryText: string;
  siblings: SpatialCuratedDeckCohortSibling[];
};
