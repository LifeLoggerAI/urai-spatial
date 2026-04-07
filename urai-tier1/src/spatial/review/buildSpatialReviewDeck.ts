
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import { buildSpatialBundleLineage } from "@/spatial/lineage/buildSpatialBundleLineage";
import type { SpatialReviewDeck, SpatialReviewDeckCard } from "@/spatial/review/spatialReviewDeckTypes";
import type { SpatialStoryBundleVaultEntry } from "@/spatial/vault/spatialStoryBundleVaultTypes";

function buildCard(input: {
  entry: SpatialStoryBundleVaultEntry;
  prevSummary: string | null;
  nextSummary: string | null;
}): SpatialReviewDeckCard {
  return {
    id: `review_${input.entry.id}`,
    entryId: input.entry.id,
    title: input.entry.label,
    subtitle: `${input.entry.source} · ${input.entry.storedAt}`,
    summary: input.entry.bundle.summaryText,
    narratorTitle: input.entry.bundle.narrator?.title ?? null,
    sceneMode: input.entry.bundle.snapshot.sceneMode,
    selectedStarId: input.entry.bundle.snapshot.selectedStarId ?? null,
    source: input.entry.source,
    lineagePrevSummary: input.prevSummary,
    lineageNextSummary: input.nextSummary,
  };
}

export function buildSpatialReviewDeck(input: {
  entries: SpatialStoryBundleVaultEntry[];
  activeEntryId: string | null;
}): SpatialReviewDeck {
  const lineage = buildSpatialBundleLineage({
    entries: input.entries,
    activeEntryId: input.activeEntryId,
  });

  const cards = input.entries.map((entry, index) => {
    const prev = index > 0 ? input.entries[index - 1] : null;
    const next = index < input.entries.length - 1 ? input.entries[index + 1] : null;

    const prevSummary =
      prev
        ? lineage.edges.find(
            (edge) => edge.fromId === prev.id && edge.toId === entry.id,
          )?.summary ?? null
        : null;

    const nextSummary =
      next
        ? lineage.edges.find(
            (edge) => edge.fromId === entry.id && edge.toId === next.id,
          )?.summary ?? null
        : null;

    return buildCard({
      entry,
      prevSummary,
      nextSummary,
    });
  });

  const summaryText =
    cards.length === 0
      ? "No review deck cards available."
      : `${cards.length} review cards derived from the story bundle vault.`;

  return {
    schema: "urai.spatial.review-deck.v1",
    activeEntryId: input.activeEntryId,
    cards,
    summaryText,
  };
}
