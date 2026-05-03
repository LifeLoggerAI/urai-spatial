import { buildSpatialCuratedDeckDispatch } from "@/spatial/curation/buildSpatialCuratedDeckDispatch";
import { buildSpatialCuratedDeckReviewTicket } from "@/spatial/curation/buildSpatialCuratedDeckReviewTicket";
import { buildSpatialCuratedDeckVerdict } from "@/spatial/curation/buildSpatialCuratedDeckVerdict";
import type {
  SpatialCuratedDeckQueueReason,
  SpatialCuratedDeckQueueSummary,
} from "@/spatial/curation/spatialCuratedDeckQueueTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toLane(score: number): "background" | "priority" | "frontline" {
  if (score <= 29) {
    return "background";
  }

  if (score <= 59) {
    return "priority";
  }

  return "frontline";
}

function toWindow(score: number): "later" | "soon" | "now" {
  if (score <= 29) {
    return "later";
  }

  if (score <= 59) {
    return "soon";
  }

  return "now";
}

function toPosition(score: number): number {
  if (score <= 29) {
    return 3;
  }

  if (score <= 59) {
    return 2;
  }

  return 1;
}

function toHandoffText(input: {
  queueLane: "background" | "priority" | "frontline";
  queueOwner: "archive-watch" | "curation-review" | "deep-inspection";
  processingWindow: "later" | "soon" | "now";
}): string {
}

export function buildSpatialCuratedDeckQueue(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckQueueSummary {
  const dispatch = buildSpatialCuratedDeckDispatch(input);
  const ticket = buildSpatialCuratedDeckReviewTicket(input);
  const verdict = buildSpatialCuratedDeckVerdict(input);

  const reasons: SpatialCuratedDeckQueueReason[] = [
    {
      id: "dispatch-inspect",
      label: "dispatch lane requires inspection",
      weight: 26,
      active: dispatch.dispatchLane === "inspect",
    },
    {
      id: "dispatch-review",
      label: "dispatch lane requires review",
      weight: 16,
      active: dispatch.dispatchLane === "review",
    },
    {
      id: "ticket-escalate",
      label: "review ticket escalated",
      weight: 24,
      active: ticket.urgency === "escalate",
    },
    {
      id: "ticket-queue",
      label: "review ticket queued",
      weight: 14,
      active: ticket.urgency === "queue",
    },
    {
      id: "verdict-investigate",
      label: "verdict points to investigation",
      weight: 18,
      active: verdict.verdictBand === "investigate",
    },
    {
      id: "verdict-monitor",
      label: "verdict points to monitoring",
      weight: 10,
      active: verdict.verdictBand === "monitor",
    },
  ];

  const activeReasons = reasons.filter((reason) => reason.active);
  const reasonScore = activeReasons.reduce((sum, reason) => sum + reason.weight, 0);

  const queueScore = clamp(
    Math.round(
      dispatch.dispatchScore * 0.45 +
      ticket.ticketScore * 0.35 +
      verdict.verdictScore * 0.20 +
      reasonScore * 0.25,
    ),
    0,
    100,
  );

  const queueLane = toLane(queueScore);
  const processingWindow = toWindow(queueScore);
  const queuePosition = toPosition(queueScore);
  const queueOwner = dispatch.dispatchOwner;
  const handoffText = toHandoffText({
    queueLane,
    queueOwner,
    processingWindow,
  });

  const parts = [
  ];

  return {
    schema: "urai.spatial.curated-deck-queue.v1",
    activeEntryId: dispatch.activeEntryId,
    totalEntries: input.entries.length,
    queueScore,
    queueLane,
    queueOwner,
    queuePosition,
    processingWindow,
    handoffText,
    activeReasonCount: activeReasons.length,
    reasons,
    summaryText: parts.join(" · "),
  };
}
