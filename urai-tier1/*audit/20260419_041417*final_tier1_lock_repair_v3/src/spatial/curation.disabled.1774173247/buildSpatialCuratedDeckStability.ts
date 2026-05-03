
import { buildSpatialCuratedDeckDiff } from "@/spatial/curation/buildSpatialCuratedDeckDiff";
import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";
import type { SpatialCuratedDeckStabilitySummary } from "@/spatial/curation/spatialCuratedDeckStabilityTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function scorePenaltyFromDiff(diff: SpatialCuratedDeckDiff | null): number {
  if (!diff) {
    return 0;
  }

  let penalty = 0;

  if (diff.sourceChanged) {
    penalty += 18;
  }

  if (diff.firstCardChanged) {
    penalty += 18;
  }

  penalty += Math.min(16, Math.abs(diff.cardCountDelta) * 4);
  penalty += Math.min(20, diff.sceneModeShiftCount * 4);
  penalty += Math.min(20, diff.selectedStarShiftCount * 4);

  if (!diff.sameAccount) {
    penalty += 10;
  }

  return penalty;
}

function toBand(score: number): "stable" | "watch" | "volatile" {
  if (score >= 75) {
    return "stable";
  }

  if (score >= 45) {
    return "watch";
  }

  return "volatile";
}

export function buildSpatialCuratedDeckStability(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckStabilitySummary {
  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-stability.v1",
      activeEntryId: null,
      totalEntries: 0,
      stabilityScore: 100,
      stabilityBand: "stable",
      comparedSides: 0,
      previousDiff: null,
      nextDiff: null,
      sourceChangedCount: 0,
      firstCardChangedCount: 0,
      sceneModeShiftTotal: 0,
      selectedStarShiftTotal: 0,
      cardDeltaMagnitude: 0,
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

  const previousDiff =
    previousEntry && activeEntry
      ? buildSpatialCuratedDeckDiff({ base: previousEntry, target: activeEntry })
      : null;

  const nextDiff =
    activeEntry && nextEntry
      ? buildSpatialCuratedDeckDiff({ base: activeEntry, target: nextEntry })
      : null;

  const comparedSides =
    (previousDiff ? 1 : 0) +
    (nextDiff ? 1 : 0);

  const sourceChangedCount =
    (previousDiff?.sourceChanged ? 1 : 0) +
    (nextDiff?.sourceChanged ? 1 : 0);

  const firstCardChangedCount =
    (previousDiff?.firstCardChanged ? 1 : 0) +
    (nextDiff?.firstCardChanged ? 1 : 0);

  const sceneModeShiftTotal =
    (previousDiff?.sceneModeShiftCount ?? 0) +
    (nextDiff?.sceneModeShiftCount ?? 0);

  const selectedStarShiftTotal =
    (previousDiff?.selectedStarShiftCount ?? 0) +
    (nextDiff?.selectedStarShiftCount ?? 0);

  const cardDeltaMagnitude =
    Math.abs(previousDiff?.cardCountDelta ?? 0) +
    Math.abs(nextDiff?.cardCountDelta ?? 0);

  const rawPenalty =
    scorePenaltyFromDiff(previousDiff) +
    scorePenaltyFromDiff(nextDiff);

  const normalizationBoost = comparedSides === 1 ? 12 : 0;
  const stabilityScore = clamp(100 - rawPenalty + normalizationBoost, 0, 100);
  const stabilityBand = toBand(stabilityScore);

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-stability.v1",
    activeEntryId: activeEntry?.id ?? null,
    totalEntries: input.entries.length,
    stabilityScore,
    stabilityBand,
    comparedSides,
    previousDiff,
    nextDiff,
    sourceChangedCount,
    firstCardChangedCount,
    sceneModeShiftTotal,
    selectedStarShiftTotal,
    cardDeltaMagnitude,
    summaryText: parts.join(" · "),
  };
}
