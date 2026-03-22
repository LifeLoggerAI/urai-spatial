import { buildSpatialCuratedDeckDiff } from "@/spatial/curation/buildSpatialCuratedDeckDiff";
import type { SpatialCuratedDeckNeighborDiffSummary } from "@/spatial/curation/spatialCuratedDeckNeighborDiffTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export function buildSpatialCuratedDeckNeighborDiff(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckNeighborDiffSummary {
  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-neighbor-diff.v1",
      activeEntryId: null,
      activeIndex: -1,
      totalEntries: 0,
      previousToActive: null,
      activeToNext: null,
      summaryText: "no curated deck vault entries",
    };
  }

  const requestedIndex = input.activeEntryId
    ? input.entries.findIndex((entry) => entry.id === input.activeEntryId)
    : -1;

  const activeIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const previousEntry = input.entries[activeIndex - 1] ?? null;
  const activeEntry = input.entries[activeIndex] ?? null;
  const nextEntry = input.entries[activeIndex + 1] ?? null;

  const previousToActive =
    previousEntry && activeEntry
      ? buildSpatialCuratedDeckDiff({ base: previousEntry, target: activeEntry })
      : null;

  const activeToNext =
    activeEntry && nextEntry
      ? buildSpatialCuratedDeckDiff({ base: activeEntry, target: nextEntry })
      : null;

  const parts = [
    `entry ${activeIndex + 1}/${input.entries.length}`,
    previousToActive ? "previous→active available" : "no previous→active diff",
    activeToNext ? "active→next available" : "no active→next diff",
  ];

  return {
    schema: "urai.spatial.curated-deck-neighbor-diff.v1",
    activeEntryId: activeEntry?.id ?? null,
    activeIndex,
    totalEntries: input.entries.length,
    previousToActive,
    activeToNext,
    summaryText: parts.join(" · "),
  };
}
