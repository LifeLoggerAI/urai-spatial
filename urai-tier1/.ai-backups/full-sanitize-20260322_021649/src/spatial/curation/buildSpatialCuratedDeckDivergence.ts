import { buildSpatialCuratedDeckConsensus } from "@/spatial/curation/buildSpatialCuratedDeckConsensus";
import type { SpatialCuratedDeckDivergenceSummary } from "@/spatial/curation/spatialCuratedDeckDivergenceTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toBand(score: number): "aligned" | "offset" | "outlier" {
  if (score <= 24) {
    return "aligned";
  }

  if (score <= 54) {
    return "offset";
  }

  return "outlier";
}

export function buildSpatialCuratedDeckDivergence(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckDivergenceSummary {
  const consensus = buildSpatialCuratedDeckConsensus(input);

  if (!consensus.activeEntryId) {
    return {
      schema: "urai.spatial.curated-deck-divergence.v1",
      activeEntryId: null,
      totalEntries: consensus.totalEntries,
      cohortSize: consensus.cohortSize,
      divergenceScore: 0,
      divergenceBand: "aligned",
      dominantSource: consensus.dominantSource,
      activeMatchesDominantSource: consensus.activeMatchesDominantSource,
      averageCardCount: consensus.averageCardCount,
      cardCountDeltaFromAverage: consensus.cardCountDeltaFromAverage,
      commonFirstCardEntryId: consensus.commonFirstCardEntryId,
      activeMatchesCommonFirstCard: consensus.activeMatchesCommonFirstCard,
      dominantFirstSceneMode: consensus.dominantFirstSceneMode,
      activeMatchesDominantFirstSceneMode: consensus.activeMatchesDominantFirstSceneMode,
      summaryText: consensus.summaryText,
    };
  }

  let score = 0;

  if (!consensus.activeMatchesDominantSource) {
    score += 28;
  }

  if (!consensus.activeMatchesCommonFirstCard) {
    score += 24;
  }

  if (!consensus.activeMatchesDominantFirstSceneMode) {
    score += 20;
  }

  score += Math.min(28, Math.abs(consensus.cardCountDeltaFromAverage) * 6);

  const divergenceScore = clamp(Math.round(score), 0, 100);
  const divergenceBand = toBand(divergenceScore);

  const parts = [
    `cohort ${consensus.cohortSize}`,
    `divergence ${divergenceScore}`,
    `band ${divergenceBand}`,
    consensus.activeMatchesDominantSource ? "source aligned" : "source offset",
    consensus.activeMatchesCommonFirstCard ? "first card aligned" : "first card offset",
    consensus.activeMatchesDominantFirstSceneMode ? "scene aligned" : "scene offset",
    `card Δ ${consensus.cardCountDeltaFromAverage}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-divergence.v1",
    activeEntryId: consensus.activeEntryId,
    totalEntries: consensus.totalEntries,
    cohortSize: consensus.cohortSize,
    divergenceScore,
    divergenceBand,
    dominantSource: consensus.dominantSource,
    activeMatchesDominantSource: consensus.activeMatchesDominantSource,
    averageCardCount: consensus.averageCardCount,
    cardCountDeltaFromAverage: consensus.cardCountDeltaFromAverage,
    commonFirstCardEntryId: consensus.commonFirstCardEntryId,
    activeMatchesCommonFirstCard: consensus.activeMatchesCommonFirstCard,
    dominantFirstSceneMode: consensus.dominantFirstSceneMode,
    activeMatchesDominantFirstSceneMode: consensus.activeMatchesDominantFirstSceneMode,
    summaryText: parts.join(" · "),
  };
}
