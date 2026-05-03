import { buildSpatialCuratedDeckDispatch } from "@/spatial/curation/buildSpatialCuratedDeckDispatch";
import { buildSpatialCuratedDeckQueue } from "@/spatial/curation/buildSpatialCuratedDeckQueue";
import { buildSpatialCuratedDeckReviewTicket } from "@/spatial/curation/buildSpatialCuratedDeckReviewTicket";
import type {
  SpatialCuratedDeckScheduleCheckpoint,
  SpatialCuratedDeckScheduleSummary,
} from "@/spatial/curation/spatialCuratedDeckScheduleTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toCadence(score: number): "deferred" | "planned" | "immediate" {
  if (score <= 29) {
    return "deferred";
  }

  if (score <= 59) {
    return "planned";
  }

  return "immediate";
}

function toEtaWindow(score: number): "backlog" | "this-pass" | "now" {
  if (score <= 29) {
    return "backlog";
  }

  if (score <= 59) {
    return "this-pass";
  }

  return "now";
}

function toReviewCycle(
  cadence: "deferred" | "planned" | "immediate",
): "weekly" | "daily" | "live" {
  switch (cadence) {
    case "deferred":
      return "weekly";
    case "planned":
      return "daily";
    case "immediate":
      return "live";
    default:
      return "weekly";
  }
}

function toOperatorText(input: {
  cadence: "deferred" | "planned" | "immediate";
  etaWindow: "backlog" | "this-pass" | "now";
  reviewCycle: "weekly" | "daily" | "live";
}): string {
}

export function buildSpatialCuratedDeckSchedule(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckScheduleSummary {
  const queue = buildSpatialCuratedDeckQueue(input);
  const dispatch = buildSpatialCuratedDeckDispatch(input);
  const ticket = buildSpatialCuratedDeckReviewTicket(input);

  const scheduleScore = clamp(
    Math.round(
      queue.queueScore * 0.5 +
      dispatch.dispatchScore * 0.3 +
      ticket.ticketScore * 0.2,
    ),
    0,
    100,
  );

  const cadence = toCadence(scheduleScore);
  const etaWindow = toEtaWindow(scheduleScore);
  const reviewCycle = toReviewCycle(cadence);
  const operatorText = toOperatorText({
    cadence,
    etaWindow,
    reviewCycle,
  });

  const checkpoints: SpatialCuratedDeckScheduleCheckpoint[] = [
    {
      id: "confirm-owner",
      label: "confirm dispatch owner and queue slot",
      timing: cadence === "immediate" ? "now" : cadence === "planned" ? "soon" : "later",
      required: true,
    },
    {
      id: "run-review-pass",
      label: "run review pass across local and cohort panels",
      timing: cadence === "immediate" ? "now" : "soon",
      required: queue.queueLane !== "background",
    },
    {
      id: "escalate-inspection",
      label: "escalate to deep inspection lane if required",
      timing: queue.queueLane === "frontline" ? "now" : "soon",
      required: dispatch.dispatchLane === "inspect",
    },
    {
      id: "retain-watch",
      label: "retain passive watch if queue remains background",
      timing: "later",
      required: queue.queueLane === "background",
    },
    {
      id: "close-ticket",
      label: "close or refresh review ticket on next cycle",
      timing: cadence === "deferred" ? "later" : "soon",
      required: true,
    },
  ];

  const requiredCheckpoints = checkpoints.filter((checkpoint) => checkpoint.required);

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-schedule.v1",
    activeEntryId: queue.activeEntryId,
    totalEntries: input.entries.length,
    scheduleScore,
    cadence,
    etaWindow,
    reviewCycle,
    operatorText,
    checkpointCount: requiredCheckpoints.length,
    checkpoints,
    summaryText: parts.join(" · "),
  };
}
