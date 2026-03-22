import { buildSpatialCuratedDeckAction } from "@/spatial/curation/buildSpatialCuratedDeckAction";
import { buildSpatialCuratedDeckQueue } from "@/spatial/curation/buildSpatialCuratedDeckQueue";
import { buildSpatialCuratedDeckSchedule } from "@/spatial/curation/buildSpatialCuratedDeckSchedule";
import type {
  SpatialCuratedDeckServiceWindowCheckpoint,
  SpatialCuratedDeckServiceWindowSummary,
} from "@/spatial/curation/spatialCuratedDeckServiceWindowTypes";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

function clamp(input: number, min: number, max: number) {
  return Math.min(max, Math.max(min, input));
}

function toServiceClass(score: number): "cold" | "warm" | "hot" {
  if (score <= 29) {
    return "cold";
  }

  if (score <= 59) {
    return "warm";
  }

  return "hot";
}

function toDeadlineBand(score: number): "backlog" | "active-pass" | "immediate-pass" {
  if (score <= 29) {
    return "backlog";
  }

  if (score <= 59) {
    return "active-pass";
  }

  return "immediate-pass";
}

function toResponseTarget(serviceClass: "cold" | "warm" | "hot"): "24h" | "4h" | "15m" {
  switch (serviceClass) {
    case "cold":
      return "24h";
    case "warm":
      return "4h";
    case "hot":
      return "15m";
    default:
      return "24h";
  }
}

function toOperatorText(input: {
  serviceClass: "cold" | "warm" | "hot";
  deadlineBand: "backlog" | "active-pass" | "immediate-pass";
  responseTarget: "24h" | "4h" | "15m";
}) {
  return `Run ${input.serviceClass} service window · ${input.deadlineBand} deadline · target ${input.responseTarget}.`;
}

export function buildSpatialCuratedDeckServiceWindow(input: {
  entries: SpatialCuratedDeckVaultEntry[];
  activeEntryId: string | null;
}): SpatialCuratedDeckServiceWindowSummary {
  const schedule = buildSpatialCuratedDeckSchedule(input);
  const queue = buildSpatialCuratedDeckQueue(input);
  const action = buildSpatialCuratedDeckAction(input);

  const serviceScore = clamp(
    Math.round(
      schedule.scheduleScore * 0.45 +
      queue.queueScore * 0.35 +
      action.actionScore * 0.20,
    ),
    0,
    100,
  );

  const serviceClass = toServiceClass(serviceScore);
  const deadlineBand = toDeadlineBand(serviceScore);
  const responseTarget = toResponseTarget(serviceClass);
  const ownerLane = queue.queueOwner;
  const operatorText = toOperatorText({
    serviceClass,
    deadlineBand,
    responseTarget,
  });

  const checkpoints: SpatialCuratedDeckServiceWindowCheckpoint[] = [
    {
      id: "confirm-service-class",
      label: "confirm service class and owner lane",
      window: deadlineBand,
      required: true,
    },
    {
      id: "start-review-window",
      label: "start review window against queue and schedule surfaces",
      window: deadlineBand === "immediate-pass" ? "immediate-pass" : "active-pass",
      required: queue.queueLane !== "background",
    },
    {
      id: "promote-inspection",
      label: "promote to deep inspection when frontline queue persists",
      window: "immediate-pass",
      required: queue.queueLane === "frontline",
    },
    {
      id: "retain-passive-watch",
      label: "retain passive watch for background queue items",
      window: "backlog",
      required: queue.queueLane === "background",
    },
    {
      id: "close-window",
      label: "close or refresh service window on next response target",
      window: deadlineBand,
      required: true,
    },
  ];

  const requiredCheckpoints = checkpoints.filter((checkpoint) => checkpoint.required);

  const parts = [
    `service ${serviceScore}`,
    `class ${serviceClass}`,
    `deadline ${deadlineBand}`,
    `target ${responseTarget}`,
    `owner ${ownerLane}`,
    `checkpoints ${requiredCheckpoints.length}`,
  ];

  return {
    schema: "urai.spatial.curated-deck-service-window.v1",
    activeEntryId: queue.activeEntryId,
    totalEntries: input.entries.length,
    serviceScore,
    serviceClass,
    deadlineBand,
    responseTarget,
    ownerLane,
    operatorText,
    checkpointCount: requiredCheckpoints.length,
    checkpoints,
    summaryText: parts.join(" · "),
  };
}
