
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialCuratedDeckExportCard } from "@/spatial/curation/spatialCuratedDeckExportTypes";
import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function countModeShifts(
  baseCards: SpatialCuratedDeckExportCard[],
  targetCards: SpatialCuratedDeckExportCard[],
): number {
  const len = Math.min(baseCards.length, targetCards.length);
  let count = 0;

  for (let i = 0; i < len; i += 1) {
    if (baseCards[i]?.sceneMode !== targetCards[i]?.sceneMode) {
      count += 1;
    }
  }

  return count;
}

function countSelectedStarShifts(
  baseCards: SpatialCuratedDeckExportCard[],
  targetCards: SpatialCuratedDeckExportCard[],
): number {
  const len = Math.min(baseCards.length, targetCards.length);
  let count = 0;

  for (let i = 0; i < len; i += 1) {
    if ((baseCards[i]?.selectedStarId ?? null) !== (targetCards[i]?.selectedStarId ?? null)) {
      count += 1;
    }
  }

  return count;
}

export function buildSpatialCuratedDeckDiff(input: {
  base: SpatialCuratedDeckVaultEntry;
  target: SpatialCuratedDeckVaultEntry;
}): SpatialCuratedDeckDiff {
  const baseDeck = input.base.deck;
  const targetDeck = input.target.deck;

  const sameAccount = baseDeck.account.id === targetDeck.account.id;
  const cardCountDelta = targetDeck.cardCount - baseDeck.cardCount;
  const sourceChanged = input.base.source !== input.target.source;
  const firstCardChanged =
    (baseDeck.cards[0]?.entryId ?? null) !== (targetDeck.cards[0]?.entryId ?? null);
  const sceneModeShiftCount = countModeShifts(baseDeck.cards, targetDeck.cards);
  const selectedStarShiftCount = countSelectedStarShifts(baseDeck.cards, targetDeck.cards);

  const parts = [
    sameAccount ? "same account scope" : "different account scope",
    sourceChanged ? "vault source changed" : "vault source stable",
    firstCardChanged ? "first card changed" : "first card stable",
  ];

  return {
    schema: "urai.spatial.curated-deck-diff.v1",
    baseEntryId: input.base.id,
    targetEntryId: input.target.id,
    sameAccount,
    cardCountDelta,
    sourceChanged,
    firstCardChanged,
    sceneModeShiftCount,
    selectedStarShiftCount,
    summaryText: parts.join(" · "),
  };
}
