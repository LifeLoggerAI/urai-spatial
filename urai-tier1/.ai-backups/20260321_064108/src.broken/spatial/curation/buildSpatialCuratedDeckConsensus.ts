import type { SpatialCuratedDeckConsensusSummary } from "@/spatial/curation/spatialCuratedDeckConsensusTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function getMode(items: string[]): string | null {
  if (items.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  let winner: string | null = null;
  let winnerCount = -1;

  for (const [item, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = item;
      winnerCount = count;
    }
  }

  return winner;
}

export function buildSpatialCuratedDeckConsensus(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckConsensusSummary {
  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-consensus.v1",
      activeEntryId: null,
      totalEntries: 0,
      cohortSize: 0,
      dominantSource: null,
      activeMatchesDominantSource: false,
      averageCardCount: 0,
      cardCountDeltaFromAverage: 0,
      commonFirstCardEntryId: null,
      activeMatchesCommonFirstCard: false,
      dominantFirstSceneMode: null,
      activeMatchesDominantFirstSceneMode: false,
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
      schema: "urai.spatial.curated-deck-consensus.v1",
      activeEntryId: null,
      totalEntries: input.entries.length,
      cohortSize: 0,
      dominantSource: null,
      activeMatchesDominantSource: false,
      averageCardCount: 0,
      cardCountDeltaFromAverage: 0,
      commonFirstCardEntryId: null,
      activeMatchesCommonFirstCard: false,
      dominantFirstSceneMode: null,
      activeMatchesDominantFirstSceneMode: false,
      summaryText: "no active curated deck vault entry",
    };
  }

  const accountId = activeEntry.deck.account.id;

  const cohort = input.entries.filter(
    (entry) => entry.deck.account.id === accountId,
  );

  const dominantSource = getMode(cohort.map((entry) => entry.source));
  const averageCardCount =
    cohort.length > 0
      ? Number(
          (
            cohort.reduce((sum, entry) => sum + entry.deck.cardCount, 0) / cohort.length
          ).toFixed(1),
        )
      : 0;

  const commonFirstCardEntryId = getMode(
    cohort
      .map((entry) => entry.deck.cards[0]?.entryId ?? null)
      .filter((value): value is string => !!value),
  );

  const dominantFirstSceneMode = getMode(
    cohort
      .map((entry) => entry.deck.cards[0]?.sceneMode ?? null)
      .filter((value): value is string => !!value),
  );

  const activeFirstCardEntryId = activeEntry.deck.cards[0]?.entryId ?? null;
  const activeFirstSceneMode = activeEntry.deck.cards[0]?.sceneMode ?? null;

  const activeMatchesDominantSource =
    !!dominantSource && activeEntry.source === dominantSource;

  const activeMatchesCommonFirstCard =
    !!commonFirstCardEntryId && activeFirstCardEntryId === commonFirstCardEntryId;

  const activeMatchesDominantFirstSceneMode =
    !!dominantFirstSceneMode && activeFirstSceneMode === dominantFirstSceneMode;

  const cardCountDeltaFromAverage = Number(
    (activeEntry.deck.cardCount - averageCardCount).toFixed(1),
  );

  const parts = [
    `cohort ${cohort.length}`,
    dominantSource ? `dominant source ${dominantSource}` : "no dominant source",
    `avg cards ${averageCardCount}`,
    `active Δ cards ${cardCountDeltaFromAverage}`,
    commonFirstCardEntryId ? "common first card present" : "no common first card",
    dominantFirstSceneMode
      ? `first scene ${dominantFirstSceneMode}`
      : "no first scene consensus",
  ];

  return {
    schema: "urai.spatial.curated-deck-consensus.v1",
    activeEntryId: activeEntry.id,
    totalEntries: input.entries.length,
    cohortSize: cohort.length,
    dominantSource,
    activeMatchesDominantSource,
    averageCardCount,
    cardCountDeltaFromAverage,
    commonFirstCardEntryId,
    activeMatchesCommonFirstCard,
    dominantFirstSceneMode,
    activeMatchesDominantFirstSceneMode,
    summaryText: parts.join(" · "),
  };
}
