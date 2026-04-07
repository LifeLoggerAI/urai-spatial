
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
export type SpatialCuratedDeckExportCard = {
  id: string;
  entryId: string;
  label: string;
  source: "generated" | "imported";
  sceneMode: string;
  selectedStarId: string | null;
  narratorTitle: string | null;
  note: string;
  summary: string;
};

export type SpatialCuratedDeckExport = {
  schema: "urai.spatial.curated-deck-export.v1";
  exportedAt: string;
  account: {
    id: string;
    label: string | null;
  };
  cardCount: number;
  cards: SpatialCuratedDeckExportCard[];
  summaryText: string;
};
