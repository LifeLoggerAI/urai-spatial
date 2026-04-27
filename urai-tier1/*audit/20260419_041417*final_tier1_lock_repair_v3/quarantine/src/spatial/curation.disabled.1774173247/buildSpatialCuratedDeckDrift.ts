
import { buildSpatialCuratedDeckDiff } from "@/spatial/curation/buildSpatialCuratedDeckDiff";
import type {
  SpatialCuratedDeckDriftStep,
  SpatialCuratedDeckDriftSummary,
} from "@/spatial/curation/spatialCuratedDeckDriftTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toBand(score: number): "calm" | "shifting" | "drifting" {
  if (score <= 24) {
    return "calm";
  }

  if (score <= 54) {
    return "shifting";
  }

  return "drifting";
}

export function buildSpatialCuratedDeckDrift(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
  windowSize?: number;
}): SpatialCuratedDeckDriftSummary {
  const windowSize = Math.max(2, input.windowSize ?? 4);

  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-drift.v1",
      activeEntryId: null,
      accountId: null,
      source: null,
      windowSize,
      stepCount: 0,
      driftScore: 0,
      driftBand: "calm",
      sourceChangedCount: 0,
      firstCardChangedCount: 0,
      sceneModeShiftTotal: 0,
      selectedStarShiftTotal: 0,
      cardDeltaMagnitude: 0,
      summaryText: "no curated deck vault entries",
      steps: [],
    };
  }

  const requestedIndex = input.activeEntryId
    ? input.entries.findIndex((entry) => entry.id === input.activeEntryId)
    : -1;

  const activeIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const activeEntry = input.entries[activeIndex] ?? null;

  if (!activeEntry) {
    return {
      schema: "urai.spatial.curated-deck-drift.v1",
      activeEntryId: null,
      accountId: null,
      source: null,
      windowSize,
      stepCount: 0,
      driftScore: 0,
      driftBand: "calm",
      sourceChangedCount: 0,
      firstCardChangedCount: 0,
      sceneModeShiftTotal: 0,
      selectedStarShiftTotal: 0,
      cardDeltaMagnitude: 0,
      summaryText: "no active curated deck vault entry",
      steps: [],
    };
  }

  const accountId = activeEntry.deck.account.id;
  const sameAccountEntries = input.entries.filter(
    (entry) => entry.deck.account.id === accountId,
  );

  const activeAccountIndex = sameAccountEntries.findIndex(
    (entry) => entry.id === activeEntry.id,
  );

  const startIndex = Math.max(0, activeAccountIndex - (windowSize - 1));
  const windowEntries = sameAccountEntries.slice(startIndex, activeAccountIndex + 1);

  const steps: SpatialCuratedDeckDriftStep[] = [];

  for (let i = 1; i < windowEntries.length; i += 1) {
    const fromEntry = windowEntries[i - 1];
    const toEntry = windowEntries[i];
    if (!fromEntry || !toEntry) {
      continue;
    }

    const diff = buildSpatialCuratedDeckDiff({
      base: fromEntry,
      target: toEntry,
    });

    steps.push({
      fromEntryId: fromEntry.id,
      toEntryId: toEntry.id,
      cardCountDelta: diff.cardCountDelta,
      sceneModeShiftCount: diff.sceneModeShiftCount,
      selectedStarShiftCount: diff.selectedStarShiftCount,
      sourceChanged: diff.sourceChanged,
      firstCardChanged: diff.firstCardChanged,
      sameAccount: diff.sameAccount,
    });
  }

  const sourceChangedCount = steps.reduce(
    (sum, step) => sum + (step.sourceChanged ? 1 : 0),
    0,
  );

  const firstCardChangedCount = steps.reduce(
    (sum, step) => sum + (step.firstCardChanged ? 1 : 0),
    0,
  );

  const sceneModeShiftTotal = steps.reduce(
    (sum, step) => sum + step.sceneModeShiftCount,
    0,
  );

  const selectedStarShiftTotal = steps.reduce(
    (sum, step) => sum + step.selectedStarShiftCount,
    0,
  );

  const cardDeltaMagnitude = steps.reduce(
    (sum, step) => sum + Math.abs(step.cardCountDelta),
    0,
  );

  const rawScore =
    sourceChangedCount * 18 +
    firstCardChangedCount * 16 +
    Math.min(24, sceneModeShiftTotal * 4) +
    Math.min(24, selectedStarShiftTotal * 4) +
    Math.min(18, cardDeltaMagnitude * 3);

  const driftScore = clamp(rawScore, 0, 100);
  const driftBand = toBand(driftScore);

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-drift.v1",
    activeEntryId: activeEntry.id,
    accountId,
    source: activeEntry.source,
    windowSize,
    stepCount: steps.length,
    driftScore,
    driftBand,
    sourceChangedCount,
    firstCardChangedCount,
    sceneModeShiftTotal,
    selectedStarShiftTotal,
    cardDeltaMagnitude,
    summaryText: parts.join(" · "),
    steps,
  };
}
