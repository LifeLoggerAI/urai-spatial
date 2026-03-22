import { buildSpatialCuratedDeckAction } from "@/spatial/curation/buildSpatialCuratedDeckAction";
import { buildSpatialCuratedDeckAnomaly } from "@/spatial/curation/buildSpatialCuratedDeckAnomaly";
import { buildSpatialCuratedDeckVerdict } from "@/spatial/curation/buildSpatialCuratedDeckVerdict";
import type {
  SpatialCuratedDeckReviewTicketItem,
  SpatialCuratedDeckReviewTicketSummary,
} from "@/spatial/curation/spatialCuratedDeckReviewTicketTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toUrgency(score: number): "defer" | "queue" | "escalate" {
  if (score <= 29) {
    return "defer";
  }

  if (score <= 59) {
    return "queue";
  }

  return "escalate";
}

function toSuggestedPath(
  urgency: "defer" | "queue" | "escalate",
): "archive-watch" | "manual-review" | "deep-inspection" {
  switch (urgency) {
    case "defer":
      return "archive-watch";
    case "queue":
      return "manual-review";
    case "escalate":
      return "deep-inspection";
    default:
      return "archive-watch";
  }
}

function toHeadline(
  urgency: "defer" | "queue" | "escalate",
  path: "archive-watch" | "manual-review" | "deep-inspection",
): string {
  if (urgency === "defer") {
    return `Low-pressure ticket · ${path}`;
  }

  if (urgency === "queue") {
    return `Active review ticket · ${path}`;
  }

  return `Escalated review ticket · ${path}`;
}

export function buildSpatialCuratedDeckReviewTicket(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckReviewTicketSummary {
  const action = buildSpatialCuratedDeckAction(input);
  const verdict = buildSpatialCuratedDeckVerdict(input);
  const anomaly = buildSpatialCuratedDeckAnomaly(input);

  const ticketScore = clamp(
    Math.round(
      action.actionScore * 0.5 +
      verdict.verdictScore * 0.3 +
      anomaly.anomalyScore * 0.2,
    ),
    0,
    100,
  );

  const urgency = toUrgency(ticketScore);
  const suggestedPath = toSuggestedPath(urgency);
  const headline = toHeadline(urgency, suggestedPath);

  const items: SpatialCuratedDeckReviewTicketItem[] = [
    {
      id: "capture-verdict",
      label: "capture operator verdict and primary reason",
      required: verdict.activeReasonCount > 0,
      doneByDefault: verdict.verdictBand === "nominal",
    },
    {
      id: "check-anomaly-flags",
      label: "check active anomaly flags against recent panels",
      required: anomaly.flagCount > 0,
      doneByDefault: anomaly.flagCount === 0,
    },
    {
      id: "compare-local-neighbors",
      label: "compare active entry with local neighbor diffs",
      required: action.recommendedAction !== "ignore",
      doneByDefault: action.recommendedAction === "ignore",
    },
    {
      id: "review-cohort-offset",
      label: "review same-account cohort offset signals",
      required: verdict.verdictBand !== "nominal",
      doneByDefault: verdict.verdictBand === "nominal",
    },
    {
      id: "escalate-deep-inspection",
      label: "escalate to deep inspection path",
      required: urgency === "escalate",
      doneByDefault: urgency !== "escalate",
    },
  ];

  const requiredCount = items.filter((item) => item.required).length;

  const parts = [
    `ticket ${ticketScore}`,
    `urgency ${urgency}`,
    `path ${suggestedPath}`,
    `required ${requiredCount}`,
    `action ${action.recommendedAction}`,
    `verdict ${verdict.verdictBand}`,
    `anomaly ${anomaly.anomalyBand}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-review-ticket.v1",
    activeEntryId: action.activeEntryId,
    totalEntries: input.entries.length,
    ticketScore,
    urgency,
    suggestedPath,
    headline,
    itemCount: items.length,
    items,
    summaryText: parts.join(" · "),
  };
}
