import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
export type SpatialReviewDeckCard = {
  id: string;
  entryId: string;
  title: string;
  subtitle: string;
  summary: string;
  narratorTitle: string | null;
  sceneMode: string;
  selectedStarId: string | null;
  source: "generated" | "imported";
  lineagePrevSummary: string | null;
  lineageNextSummary: string | null;
};

export type SpatialReviewDeck = {
  schema: "urai.spatial.review-deck.v1";
  activeEntryId: string | null;
  cards: SpatialReviewDeckCard[];
  summaryText: string;
};
