import { buildSpatialCuratedDeckDiff } from "@/spatial/curation/buildSpatialCuratedDeckDiff";
import type { SpatialCuratedDeckAnchorSummary } from "@/spatial/curation/spatialCuratedDeckAnchorTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export function buildSpatialCuratedDeckAnchor(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckAnchorSummary {
  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-anchor.v1",
      activeEntryId: null,
      totalEntries: 0,
      accountAnchorEntryId: null,
      sourceAnchorEntryId: null,
      accountAnchorDistance: 0,
      sourceAnchorDistance: 0,
      accountAnchorDiff: null,
      sourceAnchorDiff: null,
      summaryText: "no curated deck vault entries",
    };
  }

  const requestedIndex = input.activeEntryId
    ? input.entries.findIndex((entry) => entry.id === input.activeEntryId)
    : -1;

  const activeIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const activeEntry = input.entries[activeIndex] ?? null;

  if (!activeEntry) {
    return {
      schema: "urai.spatial.curated-deck-anchor.v1",
      activeEntryId: null,
      totalEntries: input.entries.length,
      accountAnchorEntryId: null,
      sourceAnchorEntryId: null,
      accountAnchorDistance: 0,
      sourceAnchorDistance: 0,
      accountAnchorDiff: null,
      sourceAnchorDiff: null,
      summaryText: "no active curated deck vault entry",
    };
  }

  const accountAnchor =
    input.entries.find(
      (entry) => entry.deck.account.id === activeEntry.deck.account.id,
    ) ?? null;

  const sourceAnchor =
    input.entries.find((entry) => entry.source === activeEntry.source) ?? null;

  const accountAnchorIndex = accountAnchor
    ? input.entries.findIndex((entry) => entry.id === accountAnchor.id)
    : -1;

  const sourceAnchorIndex = sourceAnchor
    ? input.entries.findIndex((entry) => entry.id === sourceAnchor.id)
    : -1;

  const accountAnchorDiff =
    accountAnchor && accountAnchor.id !== activeEntry.id
      ? buildSpatialCuratedDeckDiff({ base: accountAnchor, target: activeEntry })
      : null;

  const sourceAnchorDiff =
    sourceAnchor && sourceAnchor.id !== activeEntry.id
      ? buildSpatialCuratedDeckDiff({ base: sourceAnchor, target: activeEntry })
      : null;

  const accountAnchorDistance =
    accountAnchorIndex >= 0 ? Math.max(0, activeIndex - accountAnchorIndex) : 0;

  const sourceAnchorDistance =
    sourceAnchorIndex >= 0 ? Math.max(0, activeIndex - sourceAnchorIndex) : 0;

  const parts = [
    `entry ${activeIndex + 1}/${input.entries.length}`,
    accountAnchor ? `account anchor ${accountAnchor.label}` : "no account anchor",
    sourceAnchor ? `source anchor ${sourceAnchor.label}` : "no source anchor",
    `account span ${accountAnchorDistance}`,
    `source span ${sourceAnchorDistance}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-anchor.v1",
    activeEntryId: activeEntry.id,
    totalEntries: input.entries.length,
    accountAnchorEntryId: accountAnchor?.id ?? null,
    sourceAnchorEntryId: sourceAnchor?.id ?? null,
    accountAnchorDistance,
    sourceAnchorDistance,
    accountAnchorDiff,
    sourceAnchorDiff,
    summaryText: parts.join(" · "),
  };
}
