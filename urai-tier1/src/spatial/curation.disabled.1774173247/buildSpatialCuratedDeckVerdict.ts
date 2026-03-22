import { buildSpatialCuratedDeckAnomaly } from "@/spatial/curation/buildSpatialCuratedDeckAnomaly";
import { buildSpatialCuratedDeckConsensus } from "@/spatial/curation/buildSpatialCuratedDeckConsensus";
import { buildSpatialCuratedDeckDivergence } from "@/spatial/curation/buildSpatialCuratedDeckDivergence";
import { buildSpatialCuratedDeckDrift } from "@/spatial/curation/buildSpatialCuratedDeckDrift";
import { buildSpatialCuratedDeckStability } from "@/spatial/curation/buildSpatialCuratedDeckStability";
import type {
  SpatialCuratedDeckVerdictReason,
  SpatialCuratedDeckVerdictSummary,
} from "@/spatial/curation/spatialCuratedDeckVerdictTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toBand(score: number): "nominal" | "monitor" | "investigate" {
  if (score <= 29) {
    return "nominal";
  }

  if (score <= 59) {
    return "monitor";
  }

  return "investigate";
}

function getPrimaryReason(reasons: SpatialCuratedDeckVerdictReason[]): string {
  const activeReasons = reasons.filter((reason) => reason.active);

  if (activeReasons.length === 0) {
    return "no active verdict reasons";
  }

  let winner = activeReasons[0];

  for (const reason of activeReasons) {
    if (reason.weight > winner.weight) {
      winner = reason;
    }
  }

  return winner.label;
}

export function buildSpatialCuratedDeckVerdict(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckVerdictSummary {
  const anomaly = buildSpatialCuratedDeckAnomaly(input);
  const divergence = buildSpatialCuratedDeckDivergence(input);
  const drift = buildSpatialCuratedDeckDrift({
    entries: input.entries,
    activeEntryId: input.activeEntryId,
    windowSize: 4,
  });
  const stability = buildSpatialCuratedDeckStability(input);
  const consensus = buildSpatialCuratedDeckConsensus(input);

  const reasons: SpatialCuratedDeckVerdictReason[] = [
    {
      id: "anomaly-high",
      label: "stacked anomaly surface active",
      weight: 28,
      active: anomaly.anomalyBand === "anomalous",
    },
    {
      id: "divergence-high",
      label: "cohort divergence is high",
      weight: 22,
      active: divergence.divergenceBand === "outlier",
    },
    {
      id: "drift-high",
      label: "recent same-account drift is high",
      weight: 16,
      active: drift.driftBand === "drifting",
    },
    {
      id: "stability-low",
      label: "local stability is low",
      weight: 20,
      active: stability.stabilityBand === "volatile",
    },
    {
      id: "source-offset",
      label: "source is off consensus",
      weight: 10,
      active:
        !!consensus.dominantSource &&
        !consensus.activeMatchesDominantSource,
    },
    {
      id: "structure-offset",
      label: "first-card structure is off consensus",
      weight: 12,
      active:
        !consensus.activeMatchesCommonFirstCard ||
        !consensus.activeMatchesDominantFirstSceneMode,
    },
    {
      id: "card-volume-offset",
      label: "card volume is far from cohort average",
      weight: 10,
      active: Math.abs(consensus.cardCountDeltaFromAverage) >= 2,
    },
  ];

  const activeReasons = reasons.filter((reason) => reason.active);
  const weightedReasonScore = activeReasons.reduce(
    (sum, reason) => sum + reason.weight,
    0,
  );

  const score =
    weightedReasonScore +
    Math.round(anomaly.anomalyScore * 0.18) +
    Math.round(divergence.divergenceScore * 0.14) +
    Math.round(drift.driftScore * 0.10) +
    Math.round((100 - stability.stabilityScore) * 0.12);

  const verdictScore = clamp(score, 0, 100);
  const verdictBand = toBand(verdictScore);
  const primaryReason = getPrimaryReason(reasons);

  const parts = [
    `verdict ${verdictScore}`,
    `band ${verdictBand}`,
    `reasons ${activeReasons.length}`,
    `anomaly ${anomaly.anomalyBand}`,
    `divergence ${divergence.divergenceBand}`,
    `drift ${drift.driftBand}`,
    `stability ${stability.stabilityBand}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-verdict.v1",
    activeEntryId: anomaly.activeEntryId,
    totalEntries: input.entries.length,
    verdictScore,
    verdictBand,
    primaryReason,
    activeReasonCount: activeReasons.length,
    reasons,
    summaryText: parts.join(" · "),
  };
}
