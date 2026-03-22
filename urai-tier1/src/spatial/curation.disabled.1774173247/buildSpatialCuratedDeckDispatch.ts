import { buildSpatialCuratedDeckAction } from "@/spatial/curation/buildSpatialCuratedDeckAction";
import { buildSpatialCuratedDeckReviewTicket } from "@/spatial/curation/buildSpatialCuratedDeckReviewTicket";
import { buildSpatialCuratedDeckVerdict } from "@/spatial/curation/buildSpatialCuratedDeckVerdict";
import type {
  SpatialCuratedDeckDispatchSummary,
  SpatialCuratedDeckDispatchTask,
} from "@/spatial/curation/spatialCuratedDeckDispatchTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toLane(score: number): "observe" | "review" | "inspect" {
  if (score <= 29) {
    return "observe";
  }

  if (score <= 59) {
    return "review";
  }

  return "inspect";
}

function toOwner(
  lane: "observe" | "review" | "inspect",
): "archive-watch" | "curation-review" | "deep-inspection" {
  switch (lane) {
    case "observe":
      return "archive-watch";
    case "review":
      return "curation-review";
    case "inspect":
      return "deep-inspection";
    default:
      return "archive-watch";
  }
}

function toHandoffText(
  lane: "observe" | "review" | "inspect",
  owner: "archive-watch" | "curation-review" | "deep-inspection",
): string {
  switch (lane) {
    case "observe":
      return `Route to ${owner} and keep passive watch.`;
    case "review":
      return `Route to ${owner} for manual curation review.`;
    case "inspect":
      return `Route to ${owner} for immediate deep inspection.`;
    default:
      return `Route to ${owner}.`;
  }
}

export function buildSpatialCuratedDeckDispatch(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckDispatchSummary {
  const action = buildSpatialCuratedDeckAction(input);
  const ticket = buildSpatialCuratedDeckReviewTicket(input);
  const verdict = buildSpatialCuratedDeckVerdict(input);

  const dispatchScore = clamp(
    Math.round(
      action.actionScore * 0.45 +
      ticket.ticketScore * 0.35 +
      verdict.verdictScore * 0.20,
    ),
    0,
    100,
  );

  const dispatchLane = toLane(dispatchScore);
  const dispatchOwner = toOwner(dispatchLane);
  const handoffText = toHandoffText(dispatchLane, dispatchOwner);

  const tasks: SpatialCuratedDeckDispatchTask[] = [
    {
      id: "log-verdict",
      label: "log verdict score and primary reason",
      lane: "observe",
      required: verdict.activeReasonCount > 0,
    },
    {
      id: "queue-manual-review",
      label: "queue same-account cohort review",
      lane: "review",
      required: dispatchLane !== "observe",
    },
    {
      id: "check-neighbor-diffs",
      label: "check local neighbor and anchor diffs",
      lane: "review",
      required: ticket.urgency !== "defer",
    },
    {
      id: "run-deep-inspection",
      label: "run deep inspection on anomaly stack",
      lane: "inspect",
      required: dispatchLane === "inspect",
    },
    {
      id: "archive-watch",
      label: "retain passive archive watch",
      lane: "observe",
      required: dispatchLane === "observe",
    },
  ];

  const requiredTasks = tasks.filter((task) => task.required);

  const parts = [
    `dispatch ${dispatchScore}`,
    `lane ${dispatchLane}`,
    `owner ${dispatchOwner}`,
    `tasks ${requiredTasks.length}`,
    `action ${action.recommendedAction}`,
    `ticket ${ticket.urgency}`,
    `verdict ${verdict.verdictBand}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-dispatch.v1",
    activeEntryId: action.activeEntryId,
    totalEntries: input.entries.length,
    dispatchScore,
    dispatchLane,
    dispatchOwner,
    handoffText,
    requiredTaskCount: requiredTasks.length,
    tasks,
    summaryText: parts.join(" · "),
  };
}
