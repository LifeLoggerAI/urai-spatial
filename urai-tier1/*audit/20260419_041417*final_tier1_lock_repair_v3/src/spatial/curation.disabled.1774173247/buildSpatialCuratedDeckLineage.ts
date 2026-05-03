import type {
  SpatialCuratedDeckLineage,
  SpatialCuratedDeckLineageNode,
} from "@/spatial/curation/spatialCuratedDeckLineageTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function toNode(
  entry: SpatialCuratedDeckVaultEntry,
  position: "previous" | "active" | "next",
): SpatialCuratedDeckLineageNode {
  return {
    id: entry.id,
    label: entry.label,
    source: entry.source,
    accountId: entry.deck.account.id,
    cardCount: entry.deck.cardCount,
    position,
    isActive: position === "active",
  };
}

export function buildSpatialCuratedDeckLineage(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckLineage {
  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-lineage.v1",
      totalEntries: 0,
      activeIndex: -1,
      previousEntryId: null,
      activeEntryId: null,
      nextEntryId: null,
      summaryText: "no curated deck vault entries",
      nodes: [],
    };
  }

  const requestedIndex = input.activeEntryId
    ? input.entries.findIndex((entry) => entry.id === input.activeEntryId)
    : -1;

  const activeIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const previousEntry = input.entries[activeIndex - 1] ?? null;
  const activeEntry = input.entries[activeIndex] ?? null;
  const nextEntry = input.entries[activeIndex + 1] ?? null;

  const nodes: SpatialCuratedDeckLineageNode[] = [];

  if (previousEntry) {
    nodes.push(toNode(previousEntry, "previous"));
  }

  if (activeEntry) {
    nodes.push(toNode(activeEntry, "active"));
  }

  if (nextEntry) {
    nodes.push(toNode(nextEntry, "next"));
  }

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-lineage.v1",
    totalEntries: input.entries.length,
    activeIndex,
    previousEntryId: previousEntry?.id ?? null,
    activeEntryId: activeEntry?.id ?? null,
    nextEntryId: nextEntry?.id ?? null,
    summaryText: parts.join(" · "),
    nodes,
  };
}
