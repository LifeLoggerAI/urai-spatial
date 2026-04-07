
import { buildSpatialCuratedDeckDivergence } from "@/spatial/curation/buildSpatialCuratedDeckDivergence";
import { buildSpatialCuratedDeckDrift } from "@/spatial/curation/buildSpatialCuratedDeckDrift";
import { buildSpatialCuratedDeckStability } from "@/spatial/curation/buildSpatialCuratedDeckStability";
import type {
  SpatialCuratedDeckAnomalyFlag,
  SpatialCuratedDeckAnomalySummary,
} from "@/spatial/curation/spatialCuratedDeckAnomalyTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toBand(score: number): "clear" | "watch" | "anomalous" {
  if (score <= 24) {
    return "clear";
  }

  if (score <= 54) {
    return "watch";
  }

  return "anomalous";
}

export function buildSpatialCuratedDeckAnomaly(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckAnomalySummary {
  const divergence = buildSpatialCuratedDeckDivergence(input);
  const drift = buildSpatialCuratedDeckDrift({
    entries: input.entries,
    activeEntryId: input.activeEntryId,
    windowSize: 4,
  });
  const stability = buildSpatialCuratedDeckStability(input);

  const flags: SpatialCuratedDeckAnomalyFlag[] = [
    {
      id: "divergence-outlier",
      label: "cohort divergence outlier",
      severity: "high",
      active: divergence.divergenceBand === "outlier",
    },
    {
      id: "stability-volatile",
      label: "local stability volatile",
      severity: "high",
      active: stability.stabilityBand === "volatile",
    },
    {
      id: "drift-drifting",
      label: "recent account drift elevated",
      severity: "medium",
      active: drift.driftBand === "drifting",
    },
    {
      id: "source-offset",
      label: "source offset from cohort",
      severity: "medium",
      active:
        !divergence.activeMatchesDominantSource &&
        !!divergence.dominantSource,
    },
    {
      id: "structure-offset",
      label: "first-card or scene structure offset",
      severity: "medium",
      active:
        !divergence.activeMatchesCommonFirstCard ||
        !divergence.activeMatchesDominantFirstSceneMode,
    },
    {
      id: "multi-signal-shift",
      label: "multi-signal structural shift",
      severity: "high",
      active:
        drift.sceneModeShiftTotal > 0 &&
        drift.selectedStarShiftTotal > 0 &&
        stability.firstCardChangedCount > 0,
    },
  ];

  const activeFlags = flags.filter((flag) => flag.active);
  let score = 0;

  for (const flag of activeFlags) {
    if (flag.severity === "high") {
      score += 24;
    } else if (flag.severity === "medium") {
      score += 14;
    } else {
      score += 8;
    }
  }

  score += Math.min(18, Math.round(drift.driftScore / 6));
  score += Math.min(18, Math.round(divergence.divergenceScore / 6));
  score += Math.min(18, Math.round((100 - stability.stabilityScore) / 6));

  const anomalyScore = clamp(score, 0, 100);
  const anomalyBand = toBand(anomalyScore);

  const parts = [
    `flags ${activeFlags.length}`,
    `anomaly ${anomalyScore}`,
    `band ${anomalyBand}`,
    `divergence ${divergence.divergenceBand}`,
    `drift ${drift.driftBand}`,
    `stability ${stability.stabilityBand}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-anomaly.v1",
    activeEntryId: divergence.activeEntryId,
    totalEntries: input.entries.length,
    anomalyScore,
    anomalyBand,
    flagCount: activeFlags.length,
    flags,
    summaryText: parts.join(" · "),
  };
}
