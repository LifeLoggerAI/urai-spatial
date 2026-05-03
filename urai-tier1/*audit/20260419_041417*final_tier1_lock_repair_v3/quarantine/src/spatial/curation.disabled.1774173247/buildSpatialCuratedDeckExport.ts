
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialCurationBoardItem } from "@/spatial/curation/spatialCurationBoardTypes";
import type {
  SpatialCuratedDeckExport,
  SpatialCuratedDeckExportCard,
} from "@/spatial/curation/spatialCuratedDeckExportTypes";
import type { SpatialStoryBundleVaultEntry } from "@/spatial/vault/spatialStoryBundleVaultTypes";

function buildCard(input: {
  item: SpatialCurationBoardItem;
  entry: SpatialStoryBundleVaultEntry;
}): SpatialCuratedDeckExportCard {
  return {
    label: input.item.label ?? input.item.title ?? input.item.name ?? input.item.id ?? "Untitled Curation Item",
    source: ((input.item.source === "generated" || input.item.source === "imported") ? input.item.source : ((input.entry.source === "generated" || input.entry.source === "imported") ? input.entry.source : "generated")),
    sceneMode: input.entry.bundle.snapshot.sceneMode,
    selectedStarId: input.entry.bundle.snapshot.selectedStarId ?? null,
    narratorTitle: input.entry.bundle.narrator?.title ?? null,
    note: input.item.note,
    summary: input.entry.bundle.summaryText,
  };
}

export function buildSpatialCuratedDeckExport(input: {
  accountId: string;
  accountLabel: string | null;
  items: SpatialCurationBoardItem[];
  vaultEntries: SpatialStoryBundleVaultEntry[];
}): SpatialCuratedDeckExport {
  const cards = input.items
    .map((item) => {
      const entry =
        input.vaultEntries.find((candidate) => candidate.id === item.entryId) ?? null;
      if (!entry) return null;

      return buildCard({
        item,
        entry,
      });
    })
    .filter(Boolean) as SpatialCuratedDeckExportCard[];

  const summaryLines = [
    ...cards.map(
      (card, index) =>
    ),
  ];

  return {
    schema: "urai.spatial.curated-deck-export.v1",
    exportedAt: new Date().toISOString(),
    account: {
      id: input.accountId,
      label: input.accountLabel,
    },
    cardCount: cards.length,
    cards,
    summaryText: summaryLines.join("\n"),
  };
}
