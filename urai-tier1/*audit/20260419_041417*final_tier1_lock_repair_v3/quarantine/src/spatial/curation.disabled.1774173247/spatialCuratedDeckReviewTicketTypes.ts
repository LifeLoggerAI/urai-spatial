export type SpatialCuratedDeckReviewTicketItem = {
  id: string;
  label: string;
  required: boolean;
  doneByDefault: boolean;
};

export type SpatialCuratedDeckReviewTicketSummary = {
  schema: "urai.spatial.curated-deck-review-ticket.v1";
  activeEntryId: string | null;
  totalEntries: number;
  ticketScore: number;
  urgency: "defer" | "queue" | "escalate";
  suggestedPath: "archive-watch" | "manual-review" | "deep-inspection";
  headline: string;
  itemCount: number;
  items: SpatialCuratedDeckReviewTicketItem[];
  summaryText: string;
};
