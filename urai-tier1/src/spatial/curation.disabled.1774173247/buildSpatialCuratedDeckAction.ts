import { buildSpatialCuratedDeckAnomaly } from "@/spatial/curation/buildSpatialCuratedDeckAnomaly";
import { buildSpatialCuratedDeckStability } from "@/spatial/curation/buildSpatialCuratedDeckStability";
import { buildSpatialCuratedDeckVerdict } from "@/spatial/curation/buildSpatialCuratedDeckVerdict";
import type {
  SpatialCuratedDeckActionItem,
  SpatialCuratedDeckActionSummary,
} from "@/spatial/curation/spatialCuratedDeckActionTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toAction(score: number): "ignore" | "watch" | "inspect" {
  if (score <= 29) {
    return "ignore";
  }

  if (score <= 59) {
    return "watch";
  }

  return "inspect";
}

function toOperatorText(action: "ignore" | "watch" | "inspect"): string {
  switch (action) {
    case "ignore":
      return "Ignore for now";
    case "watch":
      return "Watch this entry";
    case "inspect":
      return "Inspect immediately";
    default:
      return "Ignore for now";
  }
}

export function buildSpatialCuratedDeckAction(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckActionSummary {
  const verdict = buildSpatialCuratedDeckVerdict(input);
  const anomaly = buildSpatialCuratedDeckAnomaly(input);
  const stability = buildSpatialCuratedDeckStability(input);

  const items: SpatialCuratedDeckActionItem[] = [
    {
      id: "anomaly-band",
      label: "anomaly surface is elevated",
      priority: "high",
      active: anomaly.anomalyBand === "anomalous",
    },
    {
      id: "verdict-band",
      label: "verdict recommends investigation",
      priority: "high",
      active: verdict.verdictBand === "investigate",
    },
    {
      id: "verdict-monitor",
      label: "verdict recommends monitoring",
      priority: "medium",
      active: verdict.verdictBand === "monitor",
    },
    {
      id: "stability-low",
      label: "local stability is degraded",
      priority: "medium",
      active: stability.stabilityBand !== "stable",
    },
    {
      id: "reason-stack",
      label: "multiple verdict reasons are active",
      priority: "medium",
      active: verdict.activeReasonCount >= 3,
    },
    {
      id: "signal-clear",
      label: "signals remain nominal",
      priority: "low",
      active:
        anomaly.anomalyBand === "clear" &&
        verdict.verdictBand === "nominal" &&
        stability.stabilityBand === "stable",
    },
  ];

  const activeItems = items.filter((item) => item.active);

  let score =
    Math.round(verdict.verdictScore * 0.55) +
    Math.round(anomaly.anomalyScore * 0.30) +
    Math.round((100 - stability.stabilityScore) * 0.15);

  if (activeItems.some((item) => item.id === "signal-clear")) {
    score -= 18;
  }

  const actionScore = clamp(score, 0, 100);
  const recommendedAction = toAction(actionScore);
  const operatorText = toOperatorText(recommendedAction);

  const parts = [
    `action ${actionScore}`,
    `recommend ${recommendedAction}`,
    `verdict ${verdict.verdictBand}`,
    `anomaly ${anomaly.anomalyBand}`,
    `stability ${stability.stabilityBand}`,
    `items ${activeItems.length}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-action.v1",
    activeEntryId: verdict.activeEntryId,
    totalEntries: input.entries.length,
    actionScore,
    recommendedAction,
    operatorText,
    activeItemCount: activeItems.length,
    items,
    summaryText: parts.join(" · "),
  };
}
