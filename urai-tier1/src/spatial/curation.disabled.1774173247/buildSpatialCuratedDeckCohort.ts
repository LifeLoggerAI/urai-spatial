import type {
  SpatialCuratedDeckCohort,
  SpatialCuratedDeckCohortSibling,
} from "@/spatial/curation/spatialCuratedDeckCohortTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function toSibling(
  entry: SpatialCuratedDeckVaultEntry,
  relation: SpatialCuratedDeckCohortSibling["relation"],
): SpatialCuratedDeckCohortSibling {
  return {
    id: entry.id,
    label: entry.label,
    source: entry.source,
    accountId: entry.deck.account.id,
    cardCount: entry.deck.cardCount,
    relation,
  };
}

export function buildSpatialCuratedDeckCohort(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckCohort {
  if (input.entries.length === 0) {
    return {
      schema: "urai.spatial.curated-deck-cohort.v1",
      activeEntryId: null,
      totalEntries: 0,
      sameAccountCount: 0,
      sameSourceCount: 0,
      sameAccountAndSourceCount: 0,
      previousSameAccountEntryId: null,
      nextSameAccountEntryId: null,
      summaryText: "no curated deck vault entries",
      siblings: [],
    };
  }

  const requestedIndex = input.activeEntryId
    ? input.entries.findIndex((entry) => entry.id === input.activeEntryId)
    : -1;

  const activeIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const activeEntry = input.entries[activeIndex] ?? null;

  if (!activeEntry) {
    return {
      schema: "urai.spatial.curated-deck-cohort.v1",
      activeEntryId: null,
      totalEntries: input.entries.length,
      sameAccountCount: 0,
      sameSourceCount: 0,
      sameAccountAndSourceCount: 0,
      previousSameAccountEntryId: null,
      nextSameAccountEntryId: null,
      summaryText: "no active curated deck vault entry",
      siblings: [],
    };
  }

  const accountId = activeEntry.deck.account.id;
  const source = activeEntry.source;

  const sameAccountEntries = input.entries.filter(
    (entry) => entry.deck.account.id === accountId,
  );

  const sameSourceEntries = input.entries.filter((entry) => entry.source === source);

  const sameAccountAndSourceEntries = input.entries.filter(
    (entry) => entry.deck.account.id === accountId && entry.source === source,
  );

  let previousSameAccount: SpatialCuratedDeckVaultEntry | null = null;
  for (let i = activeIndex - 1; i >= 0; i -= 1) {
    const entry = input.entries[i];
    if (entry?.deck.account.id === accountId) {
      previousSameAccount = entry;
      break;
    }
  }

  let nextSameAccount: SpatialCuratedDeckVaultEntry | null = null;
  for (let i = activeIndex + 1; i < input.entries.length; i += 1) {
    const entry = input.entries[i];
    if (entry?.deck.account.id === accountId) {
      nextSameAccount = entry;
      break;
    }
  }

  const recentSameSource = [...sameSourceEntries]
    .filter((entry) => entry.id !== activeEntry.id)
    .slice(-2)
    .reverse();

  const siblings: SpatialCuratedDeckCohortSibling[] = [];

  if (previousSameAccount) {
    siblings.push(toSibling(previousSameAccount, "previous-same-account"));
  }

  if (nextSameAccount) {
    siblings.push(toSibling(nextSameAccount, "next-same-account"));
  }

  for (const entry of recentSameSource) {
    siblings.push(toSibling(entry, "recent-same-source"));
  }

  const parts = [
    `active ${activeEntry.label}`,
    `same account ${sameAccountEntries.length}`,
    `same source ${sameSourceEntries.length}`,
    `same account+source ${sameAccountAndSourceEntries.length}`,
    previousSameAccount ? `prev account ${previousSameAccount.label}` : "no prev account match",
    nextSameAccount ? `next account ${nextSameAccount.label}` : "no next account match",
  ];

  return {
    schema: "urai.spatial.curated-deck-cohort.v1",
    activeEntryId: activeEntry.id,
    totalEntries: input.entries.length,
    sameAccountCount: sameAccountEntries.length,
    sameSourceCount: sameSourceEntries.length,
    sameAccountAndSourceCount: sameAccountAndSourceEntries.length,
    previousSameAccountEntryId: previousSameAccount?.id ?? null,
    nextSameAccountEntryId: nextSameAccount?.id ?? null,
    summaryText: parts.join(" · "),
    siblings,
  };
}
